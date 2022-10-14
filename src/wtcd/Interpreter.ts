import { getMaybePooled } from './constantsPool';
import { FunctionInvocationError, invokeFunctionRaw } from './invokeFunction';
import { binaryOperators, unaryOperators } from './operators';
import { Random } from './Random';
import { stdFunctions } from './std';
import {
  BlockExpression,
  ChoiceExpression,
  ConditionalExpression,
  DeclarationStatement,
  Expression,
  FunctionExpression,
  IfExpression,
  ListExpression,
  NativeFunction,
  OptionalLocationInfo,
  RegisterName,
  Section,
  SelectionAction,
  Statement,
  SwitchExpression,
  VariableType,
  WhileExpression,
  WTCDRoot,
} from './types';
import { arrayEquals, flat } from './utils';
import { WTCDError } from './WTCDError';
import { FeatureProvider } from './FeatureProvider';
import { ChainedCanvas } from './ChainedCanvas';

// Dispatching code for the runtime of WTCD

interface SingleChoice {
  content: string;
  disabled: boolean;
}

export interface ContentOutput {
  readonly content: Array<HTMLElement>;
  readonly choices: Array<SingleChoice>;
}

export type NumberValueRaw = number;

export interface NumberValue {
  readonly type: 'number';
  readonly value: NumberValueRaw;
}

export type BooleanValueRaw = boolean;

export interface BooleanValue {
  readonly type: 'boolean';
  readonly value: BooleanValueRaw;
}

export type StringValueRaw = string;

export interface StringValue {
  readonly type: 'string';
  readonly value: StringValueRaw;
}

export type NullValueRaw = null;

export interface NullValue {
  readonly type: 'null';
  readonly value: NullValueRaw;
}

export type ListValueRaw = ReadonlyArray<RuntimeValue>;

export interface ListValue {
  readonly type: 'list';
  readonly value: ListValueRaw;
}

export type ActionValueRaw = {
  readonly action: 'goto';
  readonly target: Array<string>;
} | {
  readonly action: 'exit';
} | {
  readonly action: 'selection';
  readonly choices: ReadonlyArray<ChoiceValue>;
} | {
  readonly action: 'function';
  readonly fn: FunctionValue;
  readonly creator: ChoiceExpression;
};

export interface ActionValue {
  readonly type: 'action';
  readonly value: ActionValueRaw;
}

export interface ChoiceValueRaw {
  readonly text: string;
  readonly action: ActionValue | NullValue;
}

export interface ChoiceValue {
  readonly type: 'choice';
  readonly value: ChoiceValueRaw;
}

export type FunctionValueRaw = {
  readonly fnType: 'wtcd',
  readonly expr: FunctionExpression;
  readonly captured: ReadonlyArray<{
    readonly name: string,
    readonly value: Variable,
  }>;
} | {
  readonly fnType: 'native',
  readonly nativeFn: NativeFunction,
} | {
  readonly fnType: 'partial';
  readonly isLeft: boolean;
  readonly applied: ReadonlyArray<RuntimeValue>;
  readonly targetFn: FunctionValue,
};

export interface FunctionValue {
  readonly type: 'function';
  readonly value: FunctionValueRaw;
}

export type RuntimeValue
  = NumberValue
  | BooleanValue
  | StringValue
  | NullValue
  | ActionValue
  | ChoiceValue
  | ListValue
  | FunctionValue;

/**
 * Represents all possible type names for runtime values.
 */
export type RuntimeValueType = RuntimeValue['type'];

/**
 * Represents a variable. It stores its type information and its value.
 */
export interface Variable {
  readonly types: null | Array<RuntimeValueType>;
  value: RuntimeValue;
}

/**
 * Extracts the unwrapped value type for a give runtime value type name
 *
 * For example, RuntimeValueRaw<"number"> = number
 */
export type RuntimeValueRaw<T extends RuntimeValueType> = Extract<
  RuntimeValue,
  { type: T }
>['value'];

/**
 * Determine whether two runtime values are equal. Uses deep value equality
 * instead of reference equality.
 */
export function isEqual(v0: RuntimeValue, v1: RuntimeValue): boolean {
  // TypeScript's generic currently does not support type narrowing.
  // Until that is fixed, this function has to have so many any, unfortunately
  if (v0.type !== v1.type) {
    return false;
  }
  switch (v0.type) {
    case 'null':
      return true;
    case 'number':
    case 'boolean':
    case 'string':
      return v0.value === v1.value;
    case 'action':
      if (v0.value.action !== (v1 as any).value.action) {
        return false;
      }
      switch (v0.value.action) {
        case 'exit':
          return true;
        case 'goto':
          return arrayEquals(v0.value.target, (v1 as any).value.target);
        case 'selection':
          return (v0.value.choices.length
            === (v1 as any).value.choices.length) &&
            (v0.value.choices.every((choice, index) => isEqual(
              choice,
              (v1 as any).value.choices[index]),
            ));
      }
      throw new Error('Shouldn\'t fall through.');
    case 'choice':
      return (
        (v0.value.text === (v1 as any).value.text) &&
        (isEqual(v0.value.action, (v1 as any).value.action))
      );
    case 'function':
      if (v0.value.fnType !== (v1 as FunctionValue).value.fnType) {
        return false;
      }
      if (v0.value.fnType === 'native') {
        return (v0.value.nativeFn === (v1 as any).value.nativeFn);
      } else if (v0.value.fnType === 'wtcd') {
        return (
          // They refer to same expression
          (v0.value.expr === (v1 as any).value.expr) &&
          (v0.value.captured.every((v0Cap, index) => {
            const v1Cap = (v1 as any).value.captured[index];
            return (
              (v0Cap.name === v1Cap.name) &&
              // Reference equality to make sure they captured the same
              // variable
              (v0Cap.value === v1Cap.value)
            );
          }))
        );
      } else {
        return (
          (v0.value.isLeft === (v1 as any).value.isLeft) &&
          (isEqual(v0.value.targetFn, (v1 as any).value.targetFn)) &&
          (arrayEquals(v0.value.applied, (v1 as any).value.applied, isEqual))
        );
      }
    case 'list':
      return (
        (v0.value.length === (v1 as ListValue).value.length) &&
        (v0.value.every((element, index) => isEqual(
          element,
          (v1 as ListValue).value[index]),
        ))
      );
  }
}

/**
 * An evaluator is responsible for evaluating an expression and return its value
 */
export type Evaluator = (expr: Expression) => RuntimeValue;

/**
 * Type of a thrown bubble signal.
 */
export enum BubbleSignalType {
  YIELD,
  RETURN,
  BREAK,
  CONTINUE,
}

/**
 * Bubble signal is used for traversing upward the call stack. It is implemented
 * with JavaScript's Error. Such signal might be yield, return, break, or
 * continue.
 */
export class BubbleSignal extends Error {
  public constructor(
    public readonly type: BubbleSignalType,
  ) {
    super('Uncaught Bubble Signal.');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Create a string describing a runtime value including its type and value.
 */
export function describe(rv: RuntimeValue): string {
  switch (rv.type) {
    case 'number':
    case 'boolean':
      return `${rv.type} (value = ${rv.value})`;
    case 'string':
      return `string (value = "${rv.value}")`;
    case 'choice':
      return `choice (action = ${describe(rv.value.action)}, label = ` +
        `"${rv.value.text}")`;
    case 'action':
      switch (rv.value.action) {
        case 'goto':
          return `action (type = goto, target = ${rv.value.target})`;
        case 'exit':
          return `action (type = exit)`;
        case 'selection':
          return `action (type = selection, choices = [${rv.value.choices
            .map(describe).join(', ')}])`;
      }
    case 'null':
      return 'null';
    case 'list':
      return `list (elements = [${rv.value.map(describe).join(', ')}])`;
    case 'function':
      if (rv.value.fnType === 'native') {
        return `function (native ${rv.value.nativeFn.name})`;
      } else if (rv.value.fnType === 'wtcd') {
        return `function (arguments = [${rv.value.expr.arguments
          .map(arg => arg.name)
          .join(', ')
        }])`;
      } else {
        return `function (partial ${rv.value.isLeft ? 'left' : 'right'}, ` +
          `applied = [${rv.value.applied.map(describe).join(', ')}], ` +
          `targetFn = ${describe(rv.value.targetFn)})`;
      }
  }
}

/**
 * Determine whether a given value is assignable to a given type declaration.
 *
 * @param type given value's type
 * @param types type declaration that is to be compared to
 * @returns whether a value with type type is assignable to a variable with type
 * declaration types
 */
export function isTypeAssignableTo(
  type: RuntimeValueType,
  types: VariableType,
) {
  return types === null || types.includes(type);
}

export function assignValueToVariable(
  variable: Variable,
  value: RuntimeValue,
  location: OptionalLocationInfo, // For error message
  variableName: string, // For error message
) {
  if (!isTypeAssignableTo(value.type, variable.types)) {
    throw WTCDError.atLocation(location, `Cannot assign value (` +
      `${describe(value)}) to variable "${variableName}". "${variableName}" ` +
      `can only store these types: ${(
        variable.types as Array<RuntimeValueType>
      ).join(', ')}`);
  }
  variable.value = value;
}

class RuntimeScope {
  private variables: Map<string, Variable> = new Map();
  private registers: Map<string, RuntimeValue> | null = null;
  /**
   * Attempt to resolve the given variable name within this scope. If variable
   * is not found, return null.
   *
   * @param variableName
   * @returns
   */
  public resolveVariableReference(variableName: string): Variable | null {
    return this.variables.get(variableName) || null;
  }
  public addVariable(variableName: string, value: Variable) {
    this.variables.set(variableName, value);
  }
  public addRegister(registerName: RegisterName) {
    if (this.registers === null) {
      this.registers = new Map();
    }
    this.registers.set(registerName, getMaybePooled('null', null));
  }
  /**
   * If a register with given name exists on this scope, set the value of it and
   * return true. Otherwise, return false.
   *
   * @param registerName name of register
   * @param value value to set to
   * @returns whether the requested register is found
   */
  public setRegisterIfExist(registerName: RegisterName, value: RuntimeValue): boolean {
    if (this.registers === null) {
      return false;
    }
    if (!this.registers.has(registerName)) {
      return false;
    }
    this.registers.set(registerName, value);
    return true;
  }
  public getRegister(registerName: RegisterName): RuntimeValue | null {
    return this.registers && this.registers.get(registerName) || null;
  }
}

export class InvalidChoiceError extends Error {
  public constructor(
    public readonly choiceId: number,
  ) {
    super(`Invalid choice ${choiceId}.`);
  }
}

export interface InterpreterHandle {
  evaluator(expr: Expression): RuntimeValue;
  pushScope(): RuntimeScope;
  popScope(): RuntimeScope | undefined;
  resolveVariableReference(variableName: string): Variable;
  getRandom(): Random;
  pushContent($element: HTMLElement): void;
  readonly timers: Map<string, number>;
  setPinnedFunction(pinnedFunction: FunctionValue | null): void;
  setStateDesc(stateDesc: string | null): void;
  readonly featureProvider: FeatureProvider;
  readonly canvases: Map<string, ChainedCanvas>;
}

export class Interpreter {
  private timers: Map<string, number> = new Map();
  private interpreterHandle: InterpreterHandle = {
    evaluator: this.evaluator.bind(this),
    pushScope: this.pushScope.bind(this),
    popScope: this.popScope.bind(this),
    resolveVariableReference: this.resolveVariableReference.bind(this),
    getRandom: () => this.random,
    pushContent: this.pushContent.bind(this),
    timers: this.timers,
    setPinnedFunction: this.setPinnedFunction.bind(this),
    setStateDesc: this.setStateDesc.bind(this),
    featureProvider: this.featureProvider,
    canvases: new Map(),
  };
  private pinnedFunction: FunctionValue | null = null;
  private pinned: Array<HTMLElement> = [];
  private stateDesc: string | null = null;
  private setPinnedFunction(pinnedFunction: FunctionValue | null) {
    this.pinnedFunction = pinnedFunction;
  }
  private setStateDesc(stateDesc: string | null) {
    this.stateDesc = stateDesc;
  }
  public constructor(
    private wtcdRoot: WTCDRoot,
    private random: Random,
    private featureProvider: FeatureProvider
  ) {
    this.sectionStack.push(this.wtcdRoot.sections[0]);
  }
  private scopes: Array<RuntimeScope> = [];
  private sectionStack: Array<Section> = [];
  private resolveVariableReference(variableName: string) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const variable = this.scopes[i].resolveVariableReference(variableName);
      if (variable !== null) {
        return variable;
      }
    }
    throw WTCDError.atUnknown(`Cannot resolve variable reference ` +
      `"${variableName}". This is most likely caused by WTCD compiler's ` +
      `error or the compiled output ` +
      `has been modified`);
  }
  /**
   * Iterate through the scopes and set the first register with registerName to
   * given value.
   *
   * @param registerName The name of register to look for
   * @param value The value to set to
   */
  private setRegister(registerName: RegisterName, value: RuntimeValue) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].setRegisterIfExist(registerName, value)) {
        return;
      }
    }
    throw WTCDError.atUnknown(`Cannot resolve register reference "${registerName}". ` +
      `This is mostly likely caused by WTCD compiler's error or the compiled output ` +
      `has been modified`);
  }
  private getCurrentScope(): RuntimeScope {
    return this.scopes[this.scopes.length - 1];
  }
  private pushScope() {
    const scope = new RuntimeScope();
    this.scopes.push(scope);
    return scope;
  }
  private popScope() {
    return this.scopes.pop();
  }
  private evaluateChoiceExpression(expr: ChoiceExpression): ChoiceValue {
    const text = this.evaluator(expr.text);
    if (text.type !== 'string') {
      throw WTCDError.atLocation(expr, `First argument of choice is expected to be a string, ` +
        `received: ${describe(text)}`);
    }
    let action = this.evaluator(expr.action);
    if (action.type !== 'action' && action.type !== 'function' && action.type !== 'null') {
      throw WTCDError.atLocation(expr, `Second argument of choice is expected to be an action, a function, ` +
        `or null, received: ${describe(text)}`);
    }
    if (action.type === 'function') {
      action = {
        type: 'action',
        value: {
          action: 'function',
          fn: action,
          creator: expr,
        },
      };
    }
    return {
      type: 'choice',
      value: {
        text: text.value,
        action,
      },
    };
  }

  private evaluateConditionalExpression(expr: ConditionalExpression): RuntimeValue {
    const condition = this.evaluator(expr.condition);
    if (condition.type !== 'boolean') {
      throw WTCDError.atLocation(expr, `First argument of a conditional expression is expected to ` +
        `be a boolean, received: ${describe(condition)}`);
    }
    // Only evaluate the necessary branch
    if (condition.value) {
      return this.evaluator(expr.then);
    } else {
      return this.evaluator(expr.otherwise);
    }
  }

  private executeDeclarationStatement(expr: DeclarationStatement) {
    for (const singleDeclaration of expr.declarations) {
      let value: RuntimeValue;
      if (singleDeclaration.initialValue !== null) {
        value = this.evaluator(singleDeclaration.initialValue);
      } else {
        if (singleDeclaration.variableType === null) {
          value = getMaybePooled('null', null);
        } else if (singleDeclaration.variableType.length === 1) {
          switch (singleDeclaration.variableType[0]) {
            case 'boolean':
              value = getMaybePooled('boolean', false);
              break;
            case 'number':
              value = getMaybePooled('number', 0);
              break;
            case 'string':
              value = getMaybePooled('string', '');
              break;
            case 'list':
              value = { type: 'list', value: [] };
              break;
            default:
              throw WTCDError.atLocation(expr, `Variable type ` +
                `"${singleDeclaration.variableType[0]}" ` +
                `does not have a default initial value`);
          }
        } else if (singleDeclaration.variableType.includes('null')) {
          // Use null if null is allowed
          value = getMaybePooled('null', null);
        } else {
          throw WTCDError.atLocation(expr, `Variable type ` +
            `"${singleDeclaration.variableType.join(' ')}" does not have a ` +
            `default initial value`);
        }
      }
      if (!isTypeAssignableTo(value.type, singleDeclaration.variableType)) {
        throw WTCDError.atLocation(expr, `The type of variable ` +
          `${singleDeclaration.variableName} is ` +
          `${singleDeclaration.variableType}, thus cannot hold ` +
          `${describe(value)}`);
      }
      this.getCurrentScope().addVariable(singleDeclaration.variableName, {
        types: singleDeclaration.variableType,
        value,
      });
    }
  }

  private evaluateBlockExpression(expr: BlockExpression): RuntimeValue {
    const scope = this.pushScope();
    try {
      scope.addRegister('yield');
      for (const statement of expr.statements) {
        this.executeStatement(statement);
      }
      return scope.getRegister('yield')!;
    } catch (error) {
      if (
        (error instanceof BubbleSignal) &&
        (error.type === BubbleSignalType.YIELD)
      ) {
        return scope.getRegister('yield')!;
      }
      throw error;
    } finally {
      this.popScope();
    }
  }

  private evaluateSelectionExpression(expr: SelectionAction): ActionValue {
    const choicesList = this.evaluator(expr.choices);
    if (choicesList.type !== 'list') {
      throw WTCDError.atLocation(expr, `Expression after selection is ` +
        `expected to be a list of choices, received: ` +
        `${describe(choicesList)}`);
    }
    const choices = choicesList.value
      .filter(choice => choice.type !== 'null');
    for (let i = 0; i < choices.length; i++) {
      if (choices[i].type !== 'choice') {
        throw WTCDError.atLocation(expr, `Choice at index ${i} is expected ` +
          `to be a choice, received: ${describe(choices[i])}`);
      }
    }
    return {
      type: 'action',
      value: {
        action: 'selection',
        choices: choices as Array<Readonly<ChoiceValue>>,
      },
    };
  }

  private evaluateListExpression(expr: ListExpression): ListValue {
    return {
      type: 'list',
      value: flat(expr.elements.map(expr => {
        if (expr.type !== 'spread') {
          return this.evaluator(expr);
        }
        const list = this.evaluator(expr.expression);
        if (list.type !== 'list') {
          throw WTCDError.atLocation(expr, `Spread operator "..." can only ` +
            `be used before a list, received: ${describe(list)}`);
        }
        return list.value;
      })),
    };
  }

  private evaluateFunctionExpression(expr: FunctionExpression): FunctionValue {
    return {
      type: 'function',
      value: {
        fnType: 'wtcd',
        expr,
        captured: expr.captures.map(variableName => ({
          name: variableName,
          value: this.resolveVariableReference(variableName),
        })),
      },
    };
  }

  private evaluateSwitchExpression(expr: SwitchExpression): RuntimeValue {
    const switchValue = this.evaluator(expr.expression);
    for (const switchCase of expr.cases) {
      const matches = this.evaluator(switchCase.matches);
      if (matches.type !== 'list') {
        throw WTCDError.atLocation(switchCase.matches, `Value to match for ` +
          `each case is expected to be a list, received: ` +
          `${describe(matches)}`);
      }
      if (matches.value.some(oneMatch => isEqual(oneMatch, switchValue))) {
        // Matched
        return this.evaluator(switchCase.returns);
      }
    }
    // Default
    if (expr.defaultCase === null) {
      throw WTCDError.atLocation(expr, `None of the cases matched and no ` +
        `default case is provided`);
    } else {
      return this.evaluator(expr.defaultCase);
    }
  }

  private evaluateWhileExpression(expr: WhileExpression) {
    const scope = this.pushScope();
    scope.addRegister('break');
    let continueFlag = false;
    try { // Break
      while (true) {
        if (!continueFlag && expr.preExpr !== null) {
          try { // Continue
            this.evaluator(expr.preExpr);
          } catch (error) {
            if (!(
              (error instanceof BubbleSignal) &&
              (error.type === BubbleSignalType.CONTINUE)
            )) {
              throw error;
            }
          }
        }
        continueFlag = false;
        const whileCondition = this.evaluator(expr.condition);
        if (whileCondition.type !== 'boolean') {
          throw WTCDError.atLocation(expr, `Condition expression of a while ` +
            `loop is expected to return a boolean. Received: ` +
            `${describe(whileCondition)}`);
        }
        if (whileCondition.value === false) {
          break;
        }
        if (expr.postExpr !== null) {
          try { // Continue
            this.evaluator(expr.postExpr);
          } catch (error) {
            if (!(
              (error instanceof BubbleSignal) &&
              (error.type === BubbleSignalType.CONTINUE)
            )) {
              throw error;
            }
            continueFlag = true;
          }
        }
      }
    } catch (error) {
      if (
        (error instanceof BubbleSignal) &&
        (error.type === BubbleSignalType.BREAK)
      ) {
        return scope.getRegister('break')!;
      }
      throw error;
    } finally {
      this.popScope();
    }
    return scope.getRegister('break')!;
  }

  private evaluateIfExpression(expr: IfExpression) {
    const condition = this.evaluator(expr.condition);
    if (condition.type !== 'boolean') {
      throw WTCDError.atLocation(expr, `The condition of an if expression is ` +
        `expected to be a boolean. Received: ${describe(condition)}`);
    }
    if (condition.value) {
      return this.evaluator(expr.then);
    } else if (expr.otherwise !== null) {
      return this.evaluator(expr.otherwise);
    } else {
      return getMaybePooled('null', null);
    }
  }

  private evaluator(expr: Expression): RuntimeValue {
    switch (expr.type) {
      case 'unaryExpression':
        return unaryOperators.get(expr.operator)!.fn(
          expr,
          this.interpreterHandle,
        );
      case 'binaryExpression':
        return binaryOperators.get(expr.operator)!.fn(
          expr,
          this.interpreterHandle,
        );
      case 'booleanLiteral':
        return getMaybePooled('boolean', expr.value);
      case 'numberLiteral':
        return getMaybePooled('number', expr.value);
      case 'stringLiteral':
        return getMaybePooled('string', expr.value);
      case 'nullLiteral':
        return getMaybePooled('null', null);
      case 'list':
        return this.evaluateListExpression(expr);
      case 'choiceExpression':
        return this.evaluateChoiceExpression(expr);
      case 'conditionalExpression':
        return this.evaluateConditionalExpression(expr);
      case 'block':
        return this.evaluateBlockExpression(expr);
      case 'gotoAction':
        return {
          type: 'action',
          value: {
            action: 'goto',
            target: expr.sections,
          },
        };
      case 'exitAction':
        return {
          type: 'action',
          value: {
            action: 'exit',
          },
        };
      case 'selection':
        return this.evaluateSelectionExpression(expr);
      case 'variableReference':
        return this.resolveVariableReference(expr.variableName).value;
      case 'function':
        return this.evaluateFunctionExpression(expr);
      case 'switch':
        return this.evaluateSwitchExpression(expr);
      case 'while':
        return this.evaluateWhileExpression(expr);
      case 'if':
        return this.evaluateIfExpression(expr);
      case 'tag':
        return {
          type: 'list',
          value: [ getMaybePooled('string', expr.name) ],
        };
    }
  }

  private executeStatement(statement: Statement) {
    switch (statement.type) {
      case 'declaration':
        this.executeDeclarationStatement(statement);
        return;
      case 'expression':
        this.evaluator(statement.expression);
        return;
      case 'yield':
        this.setRegister('yield', this.evaluator(statement.value));
        throw new BubbleSignal(BubbleSignalType.YIELD); // Bubble up
      case 'setYield':
        this.setRegister('yield', this.evaluator(statement.value));
        return;
      case 'return':
        this.setRegister('return', this.evaluator(statement.value));
        throw new BubbleSignal(BubbleSignalType.RETURN);
      case 'setReturn':
        this.setRegister('return', this.evaluator(statement.value));
        return;
      case 'break':
        this.setRegister('break', this.evaluator(statement.value));
        throw new BubbleSignal(BubbleSignalType.BREAK);
      case 'setBreak':
        this.setRegister('break', this.evaluator(statement.value));
        return;
      case 'continue':
        throw new BubbleSignal(BubbleSignalType.CONTINUE);
    }
  }

  private addToSectionStack(sectionName: string) {
    for (const section of this.wtcdRoot.sections) {
      if (section.name === sectionName) {
        this.sectionStack.push(section);
        return;
      }
    }
    throw WTCDError.atUnknown(`Unknown section "${sectionName}"`);
  }

  private updatePinned() {
    if (this.pinnedFunction !== null) {
      try {
        invokeFunctionRaw(
          this.pinnedFunction.value,
          [],
          this.interpreterHandle,
        );
      } catch (error) {
        if (error instanceof FunctionInvocationError) {
          throw WTCDError.atUnknown(`Failed to invoke the pinned ` +
            `function (${describe(this.pinnedFunction)}): ` +
            error.message);
        } else if (error instanceof WTCDError) {
          error.pushWTCDStack(`Pinned function (` +
            `${describe(this.pinnedFunction)})`);
        }
        throw error;
      }
      this.pinned = this.currentlyBuilding;
      this.currentlyBuilding = [];
    } else if (this.pinned.length !== 0) {
      this.pinned = [];
    }
  }

  private *executeAction(action: ActionValue): Generator<ContentOutput, void, number> {
    switch (action.value.action) {
      case 'goto':
        for (let i = action.value.target.length - 1; i >= 0; i--) {
          this.addToSectionStack(action.value.target[i]);
        }
        break;
      case 'exit':
        // Clears the section stack so the scripts end immediately
        this.sectionStack.length = 0;
        break;
      case 'selection': {
        const choicesRaw = action.value.choices;
        const choices: Array<SingleChoice> = choicesRaw.map(choice => ({
          content: choice.value.text,
          disabled: choice.value.action.type === 'null',
        }));
        const yieldValue: ContentOutput = {
          content: this.currentlyBuilding,
          choices,
        };
        this.currentlyBuilding = [];

        this.updatePinned();

        // Hands over control so player can make a decision
        const playerChoiceIndex = yield yieldValue;
        const playerChoice = choicesRaw[playerChoiceIndex];
        if (playerChoice === undefined || playerChoice.value.action.type === 'null') {
          throw new InvalidChoiceError(playerChoiceIndex);
        }
        yield* this.executeAction(playerChoice.value.action);
        break;
      }
      case 'function': {
        let newAction: RuntimeValue;
        try {
          newAction = invokeFunctionRaw(
            action.value.fn.value,
            [], this.interpreterHandle,
          );
        } catch (error) {
          if (error instanceof FunctionInvocationError) {
            throw WTCDError.atLocation(
              action.value.creator,
              `Failed to evaluate the function action for this choice: ` +
                `${error.message}`,
            );
          } else if (error instanceof WTCDError) {
            error.pushWTCDStack(`Function action`, action.value.creator);
          }
          throw error;
        }
        if (newAction.type === 'action') {
          yield* this.executeAction(newAction);
        } else if (newAction.type !== 'null') {
          throw WTCDError.atLocation(action.value.creator, `Value returned ` +
            `an function action is expected to be an action or null. ` +
            `Received: ${describe(newAction)}`);
        }
        break;
      }
    }
  }

  private started = false;
  private sectionEnterTimes = new Map<string, number>();
  private currentlyBuilding: Array<HTMLElement> = [];
  private pushContent($element: HTMLElement) {
    this.currentlyBuilding.push($element);
  }
  private runSection(section: Section): RuntimeValue {
    const $mdHost = document.createElement('div');

    // Evaluate the executes clause
    if (section.executes !== null) {
      this.evaluator(section.executes);
    }

    /** Times this section has been entered including this time */
    const enterTime = this.sectionEnterTimes.has(section.name)
      ? this.sectionEnterTimes.get(section.name)! + 1
      : 1;
    this.sectionEnterTimes.set(section.name, enterTime);

    /** Content that fits within the bounds */
    const eligibleSectionContents = section.content.filter(
      content => (content.lowerBound === undefined || content.lowerBound <= enterTime) &&
        (content.upperBound === undefined || content.upperBound >= enterTime),
    );
    if (eligibleSectionContents.length !== 0) {
      const selectedContent = eligibleSectionContents[
        this.random.nextInt(0, eligibleSectionContents.length)
      ];
      $mdHost.innerHTML = selectedContent.html;

      // Parameterize
      for (const variable of selectedContent.variables) {
        ($mdHost.getElementsByClassName(variable.elementClass)[0] as HTMLSpanElement)
          .innerText = String(this.resolveVariableReference(variable.variableName).value.value);
      }
      let $current = $mdHost.firstChild;
      while ($current !== null) {
        if ($current instanceof HTMLElement) {
          this.pushContent($current);
        }
        $current = $current.nextSibling;
      }
    }
    return this.evaluator(section.then);
  }
  public getPinned() {
    return this.pinned;
  }
  public getStateDesc() {
    return this.stateDesc;
  }
  public *start(): Generator<ContentOutput, ContentOutput, number> {
    const stdScope = this.pushScope();
    for (const stdFunction of stdFunctions) {
      stdScope.addVariable(stdFunction.name, {
        types: ['function'],
        value: {
          type: 'function',
          value: {
            fnType: 'native',
            nativeFn: stdFunction,
          },
        },
      });
    }

    // Global scope
    this.pushScope();

    if (this.started) {
      throw new Error('Interpretation has already started.');
    }
    this.started = true;

    let lastSection: Section | null = null;

    try {
      // Initialization
      for (const statement of this.wtcdRoot.initStatements) {
        this.executeStatement(statement);
      }
      while (this.sectionStack.length !== 0) {
        const currentSection = this.sectionStack.pop()!;
        lastSection = currentSection;

        const then = this.runSection(currentSection);

        if (then.type === 'action') {
          yield* this.executeAction(then);
        } else if (then.type !== 'null') {
          throw WTCDError.atLocation(currentSection.then, `Expression after ` +
            `then is expected to return an action, or null, ` +
            `received: ${describe(then)}`);
        }
      }
    } catch (error) {
      if (error instanceof BubbleSignal) {
        throw WTCDError.atUnknown(`Uncaught BubbleSignal with type "${error.type}".`);
      }
      if (error instanceof WTCDError) {
        if (lastSection === null) {
          error.pushWTCDStack(`initialization`);
        } else {
          error.pushWTCDStack(`section "${lastSection.name}"`, lastSection);
        }
      }
      throw error;
    }
    const lastContent = {
      content: this.currentlyBuilding,
      choices: [],
    };
    this.updatePinned();
    return lastContent;
  }
}

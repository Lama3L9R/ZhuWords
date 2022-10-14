import * as MDI from 'markdown-it';
import { RuntimeValueType } from './Interpreter';
import { BinaryOperator, binaryOperators, conditionalOperatorPrecedence, UnaryOperator, unaryOperators } from './operators';
import { SimpleIdGenerator } from './SimpleIdGenerator';
import { stdFunctions } from './std';
import { Token, TokenStream } from './TokenStream';
import {
  BinaryExpression,
  BlockExpression,
  BooleanLiteral,
  BreakStatement,
  ChoiceExpression,
  ConditionalExpression,
  ContinueStatement,
  DeclarationStatement,
  ExitAction,
  Expression,
  ExpressionStatement,
  FunctionArgument,
  FunctionExpression,
  GotoAction,
  IfExpression,
  ListExpression,
  NullLiteral,
  NumberLiteral,
  OneVariableDeclaration,
  OptionalLocationInfo,
  RegisterName,
  ReturnStatement,
  Section,
  SelectionAction,
  SetBreakStatement,
  SetReturnStatement,
  SetYieldStatement,
  SingleSectionContent,
  SpreadExpression,
  Statement,
  StringLiteral,
  SwitchCase,
  SwitchExpression,
  TagExpression,
  UnaryExpression,
  VariableReference,
  VariableType,
  WhileExpression,
  WTCDParseResult,
  WTCDRoot,
  YieldStatement,
} from './types';
import { WTCDError } from './WTCDError';

const CURRENT_MAJOR_VERSION = 1;
const CURRENT_MINOR_VERSION = 3;

const CURRENT_VERSION_STR = CURRENT_MAJOR_VERSION + '.' + CURRENT_MINOR_VERSION;

const variableTypes = [
  'null',
  'number',
  'boolean',
  'string',
  'action',
  'choice',
  'selection',
  'list',
  'function',
];

// V1.1 removed selection type and combined it into action
function backwardsCompTypeTransformer(
  variableType: RuntimeValueType | 'selection',
): RuntimeValueType {
  if (variableType === 'selection') {
    return 'action';
  } else {
    return variableType;
  }
}

export interface SimpleLogger {
  info(msg: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

/**
 * Represents a single lexical scope. Managed by LexicalScopeProvide.
 */
class LexicalScope {
  private declaredVariables: Set<string> = new Set();
  private registers: Set<RegisterName> = new Set();
  private onVariableReferenceNotFoundTriggers: Array<(variableName: string) => void> = [];
  /** Whether this lexical scope contains the given variable */
  public hasVariable(variableName: string) {
    const result = this.declaredVariables.has(variableName);
    if (!result) {
      this.onVariableReferenceNotFoundTriggers.forEach(trigger => trigger(variableName));
    }
    return result;
  }
  /** Add a variable to this lexical scope */
  public addVariable(variableName: string) {
    this.declaredVariables.add(variableName);
  }
  /** Whether this lexical scope contains the given register */
  public hasRegister(registerName: RegisterName) {
    return this.registers.has(registerName);
  }
  /** Add a register to this lexical scope */
  public addRegister(registerName: RegisterName) {
    this.registers.add(registerName);
  }
  public addOnVariableReferenceNotFoundTrigger(trigger: (variableName: string) => void) {
    this.onVariableReferenceNotFoundTriggers.push(trigger);
  }
}

/**
 * Provide lexical context for the parser.
 * Mainly used to resolve lexical scope each variable reference uses.
 */
class LexicalScopeProvider {
  private scopes: Array<LexicalScope> = [];
  public constructor() {
    this.enterScope(); // Std scope
    stdFunctions.forEach(
      stdFunction => this.addVariableToCurrentScope(stdFunction.name),
    );

    this.enterScope(); // Global scope
  }
  private getCurrentScope() {
    return this.scopes[this.scopes.length - 1];
  }
  public enterScope() {
    this.scopes.push(new LexicalScope());
  }
  public exitScope() {
    this.scopes.pop();
  }
  public currentScopeHasVariable(variableName: string) {
    return this.getCurrentScope().hasVariable(variableName);
  }
  public addVariableToCurrentScope(variableName: string) {
    this.getCurrentScope().addVariable(variableName);
  }
  /**
   * Add a callback function when a variable lookup is crossing the boundary of
   * this scope.
   *
   * This is currently used to detect variables that require capture in a
   * closure.
   *
   * @param trigger Callback
   */
  public addOnVariableReferenceNotFoundTriggerToCurrentScope(trigger: (variableName: string) => void) {
    this.getCurrentScope().addOnVariableReferenceNotFoundTrigger(trigger);
  }
  public hasVariableReference(variableName: string): boolean {
    // Use a manual for loop instead of Array.prototype.some to ensure access order
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].hasVariable(variableName)) {
        return true;
      }
    }
    return false;
  }
  public addRegisterToCurrentScope(registerName: RegisterName) {
    this.getCurrentScope().addRegister(registerName);
  }
  public hasRegister(registerName: RegisterName) {
    return this.scopes.some(scope => scope.hasRegister(registerName));
  }
}

class LogicParser {
  private tokenStream: TokenStream;
  private lexicalScopeProvider = new LexicalScopeProvider();
  private initStatements: Array<Statement> = [];
  private postChecks: Array<() => void | never> = [];
  private sections: Array<Section> = [];
  private rootDeclarations: Set<string> = new Set();
  public constructor(
    source: string,
    private readonly logger: SimpleLogger,
    private readonly sourceMap: boolean,
  ) {
    this.tokenStream = new TokenStream(source);
  }

  private attachLocationInfo<T extends OptionalLocationInfo>(token: OptionalLocationInfo | undefined, target: T) {
    if (this.sourceMap) {
      if (token === undefined) {
        return this.tokenStream.throwUnexpectedNext();
      }
      target.line = token.line;
      target.column = token.column;
    }
    return target;
  }

  private parseVariableType(): VariableType {
    if (!this.tokenStream.isNext('keyword', variableTypes)) {
      return null;
    }
    const types: Array<RuntimeValueType> = [];
    do {
      types.push(backwardsCompTypeTransformer(
        this.tokenStream.next().content as RuntimeValueType,
      ));
    } while (this.tokenStream.isNext('keyword', variableTypes));
    return types;
  }

  private parseChoice() {
    const choiceToken = this.tokenStream.assertAndSkipNext('keyword', 'choice');
    const text = this.parseExpression();
    const action = this.parseExpression();
    return this.attachLocationInfo<ChoiceExpression>(choiceToken, {
      type: 'choiceExpression',
      text,
      action,
    });
  }

  private parseSectionName: () => string = () => {
    const targetToken = this.tokenStream.assertAndSkipNext('identifier');
    this.postChecks.push(() => {
      if (!this.sections.some(section => section.name === targetToken.content)) {
        throw WTCDError.atLocation(targetToken, `Unknown section "${targetToken.content}"`);
      }
    });
    return targetToken.content;
  }

  private parseGotoAction(): GotoAction {
    const gotoToken = this.tokenStream.assertAndSkipNext('keyword', 'goto');
    return this.attachLocationInfo<GotoAction>(gotoToken, {
      type: 'gotoAction',
      sections: this.parseListOrSingleElement(
        this.parseSectionName,

        // Allow zero elements because we allow actions like goto []
        false,
      ),
    });
  }

  private parseList() {
    const leftBracket = this.tokenStream.assertAndSkipNext('punctuation', '[');
    const elements: Array<Expression | SpreadExpression> = [];
    while (!this.tokenStream.isNext('punctuation', ']')) {
      if (this.tokenStream.isNext('operator', '...')) {
        elements.push(this.attachLocationInfo<SpreadExpression>(
          this.tokenStream.next(), {
            type: 'spread',
            expression: this.parseExpression(),
          },
        ));
      } else {
        elements.push(this.parseExpression());
      }
    }
    this.tokenStream.assertAndSkipNext('punctuation', ']');
    return this.attachLocationInfo<ListExpression>(leftBracket, {
      type: 'list',
      elements,
    });
  }

  private parseFunctionCore(isFull: boolean): FunctionExpression {
    const functionArguments: Array<FunctionArgument> = [];
    this.lexicalScopeProvider.enterScope();
    this.lexicalScopeProvider.addRegisterToCurrentScope('return');
    const capturesSet: Set<string> = new Set();
    this.lexicalScopeProvider
      .addOnVariableReferenceNotFoundTriggerToCurrentScope(
        variableName => capturesSet.add(variableName),
      );
    let restArgName: string | null = null;
    let expression: null | Expression = null;
    // If is full, parameter list is mandatory
    if (isFull || this.tokenStream.isNext('punctuation', '[')) {
      // Function switch
      if (this.tokenStream.isNext('keyword', 'switch')) {
        const switchToken = this.tokenStream.assertAndSkipNext(
          'keyword',
          'switch',
        );
        functionArguments.push(this.attachLocationInfo<FunctionArgument>(
          switchToken, {
            type: null,
            name: '$switch',
            defaultValue: null,
          },
        ));
        expression = this.parseSwitchCore(
          switchToken,
          this.attachLocationInfo<VariableReference>(switchToken, {
            type: 'variableReference',
            variableName: '$switch',
          }),
        );
      } else {
        this.tokenStream.assertAndSkipNext('punctuation', '[');
        const usedArgumentNames: Set<string> = new Set();
        while (!this.tokenStream.isNext('punctuation', ']')) {
          if (this.tokenStream.isNext('operator', '...')) {
            this.tokenStream.next(); // Skip over ...
            // Rest arguments
            const restArgToken = this.tokenStream.assertAndSkipNext('identifier');
            if (usedArgumentNames.has(restArgToken.content)) {
              throw WTCDError.atLocation(restArgToken, `Argument ` +
                `"${restArgToken.content}" already existed.`);
            }
            restArgName = restArgToken.content;
            break; // Stop reading any more arguments
          }
          const argType = this.parseVariableType();
          const argNameToken = this.tokenStream.assertAndSkipNext('identifier');

          if (usedArgumentNames.has(argNameToken.content)) {
            throw WTCDError.atLocation(argNameToken, `Argument ` +
              `"${argNameToken.content}" already existed.`);
          }
          usedArgumentNames.add(argNameToken.content);

          let defaultValue: null | Expression = null;
          if (this.tokenStream.isNext('operator', '=')) {
            this.tokenStream.next();
            defaultValue = this.parseExpression();
          }
          functionArguments.push(this.attachLocationInfo<FunctionArgument>(
            argNameToken, {
              type: argType,
              name: argNameToken.content,
              defaultValue,
            },
          ));
        }
        this.tokenStream.assertAndSkipNext('punctuation', ']');
      }
    }
    functionArguments.forEach(
      argument => this.lexicalScopeProvider.addVariableToCurrentScope(
        argument.name,
      ),
    );
    if (restArgName !== null) {
      this.lexicalScopeProvider.addVariableToCurrentScope(restArgName);
    }
    if (expression === null) {
      expression = this.parseExpression();
    }
    this.lexicalScopeProvider.exitScope();
    return {
      type: 'function',
      arguments: functionArguments,
      restArgName,
      captures: Array.from(capturesSet),
      expression,
    };
  }

  // function [...] ...
  private parseFullFunctionExpression() {
    return this.attachLocationInfo<FunctionExpression>(
      this.tokenStream.assertAndSkipNext('keyword', 'function'),
      this.parseFunctionCore(true),
    );
  }

  private parseShortFunctionExpression() {
    return this.attachLocationInfo<FunctionExpression>(
      this.tokenStream.assertAndSkipNext('punctuation', '$'),
      this.parseFunctionCore(false),
    );
  }

  private parseSwitchCore(switchToken: Token, expression: Expression) {
    this.tokenStream.assertAndSkipNext('punctuation', '[');
    const cases: Array<SwitchCase> = [];
    let defaultCase: Expression | null = null;
    while (!this.tokenStream.isNext('punctuation', ']')) {
      const matches = this.parseExpression();
      if (this.tokenStream.isNext('punctuation', ']')) {
        // Default case
        defaultCase = matches;
        break;
      }
      const returns = this.parseExpression();
      cases.push({ matches, returns });
    }
    this.tokenStream.assertAndSkipNext('punctuation', ']');
    return this.attachLocationInfo<SwitchExpression>(switchToken, {
      type: 'switch',
      expression,
      cases,
      defaultCase,
    });
  }

  private parseSwitchExpression() {
    const switchToken = this.tokenStream.assertAndSkipNext('keyword', 'switch');
    const expression = this.parseExpression();
    return this.parseSwitchCore(switchToken, expression);
  }

  private parseWhileExpression(): WhileExpression {
    const mainToken = this.tokenStream.peek();
    this.lexicalScopeProvider.enterScope();
    this.lexicalScopeProvider.addRegisterToCurrentScope('break');
    let preExpr: Expression | null = null;
    if (this.tokenStream.isNext('keyword', 'do')) {
      this.tokenStream.next();
      preExpr = this.parseExpression();
    }
    this.tokenStream.assertAndSkipNext('keyword', 'while');
    const condition = this.parseExpression();
    let postExpr: Expression | null = null;
    if (preExpr === null) {
      postExpr = this.parseExpression();
    } else if (this.tokenStream.isNext('keyword', 'then')) {
      this.tokenStream.next();
      postExpr = this.parseExpression();
    }
    this.lexicalScopeProvider.exitScope();
    return this.attachLocationInfo<WhileExpression>(mainToken, {
      type: 'while',
      preExpr,
      condition,
      postExpr,
    });
  }

  private parseIfExpression(): IfExpression {
    const ifToken = this.tokenStream.assertAndSkipNext('keyword', 'if');
    const condition = this.parseExpression();
    const then = this.parseExpression();
    let otherwise: Expression | null = null;
    if (this.tokenStream.isNext('keyword', 'else')) {
      this.tokenStream.next();
      otherwise = this.parseExpression();
    }
    return this.attachLocationInfo<IfExpression>(ifToken, {
      type: 'if',
      condition,
      then,
      otherwise,
    });
  }

  /**
   * Try to parse an atom node, which includes:
   * - number literals
   * - string literals
   * - boolean literals
   * - nulls
   * - selection
   * - choices
   * - goto actions
   * - exit actions
   * - groups
   * - lists
   * - functions
   * - variables
   * - switches
   * - while loops
   * - if
   * - tags
   * - block expressions
   * - unary expressions
   *
   * @param softFail If true, when parsing failed, null is returned instead of
   * throwing error.
   */
  private parseAtom(): Expression;
  private parseAtom(softFail: true): Expression | null;
  private parseAtom(softFail?: true): Expression | null {
    // Number literal
    if (this.tokenStream.isNext('number')) {
      return this.attachLocationInfo<NumberLiteral>(this.tokenStream.peek(), {
        type: 'numberLiteral',
        value: Number(this.tokenStream.next().content),
      });
    }

    // String literal
    if (this.tokenStream.isNext('string')) {
      return this.attachLocationInfo<StringLiteral>(this.tokenStream.peek(), {
        type: 'stringLiteral',
        value: this.tokenStream.next().content,
      });
    }

    // Boolean literal
    if (this.tokenStream.isNext('keyword', ['true', 'false'])) {
      return this.attachLocationInfo<BooleanLiteral>(this.tokenStream.peek(), {
        type: 'booleanLiteral',
        value: this.tokenStream.next().content === 'true',
      });
    }

    // Null
    if (this.tokenStream.isNext('keyword', 'null')) {
      return this.attachLocationInfo<NullLiteral>(this.tokenStream.next(), {
        type: 'nullLiteral',
      });
    }

    // Selection
    if (this.tokenStream.isNext('keyword', 'selection')) {
      return this.attachLocationInfo<SelectionAction>(this.tokenStream.next(), {
        type: 'selection',
        choices: this.parseExpression(),
      });
    }

    // Choice
    if (this.tokenStream.isNext('keyword', 'choice')) {
      return this.parseChoice();
    }

    // Goto actions
    if (this.tokenStream.isNext('keyword',  'goto')) {
      return this.parseGotoAction();
    }

    // Exit actions
    if (this.tokenStream.isNext('keyword', 'exit')) {
      return this.attachLocationInfo<ExitAction>(this.tokenStream.next(), {
        type: 'exitAction',
      });
    }

    // Group
    if (this.tokenStream.isNext('punctuation', '(')) {
      this.tokenStream.next();
      const result = this.parseExpression();
      this.tokenStream.assertAndSkipNext('punctuation', ')');
      return result;
    }

    // List
    if (this.tokenStream.isNext('punctuation', '[')) {
      return this.parseList();
    }

    // Function
    if (this.tokenStream.isNext('keyword', 'function')) {
      return this.parseFullFunctionExpression();
    }

    // Short function
    if (this.tokenStream.isNext('punctuation', '$')) {
      return this.parseShortFunctionExpression();
    }

    // Switch
    if (this.tokenStream.isNext('keyword', 'switch')) {
      return this.parseSwitchExpression();
    }

    // While
    if (this.tokenStream.isNext('keyword', ['while', 'do'])) {
      return this.parseWhileExpression();
    }

    // If
    if (this.tokenStream.isNext('keyword', 'if')) {
      return this.parseIfExpression();
    }

    // Tag
    if (this.tokenStream.isNext('tag')) {
      return this.attachLocationInfo<TagExpression>(
        this.tokenStream.peek(),
        { type: 'tag', name: this.tokenStream.next().content },
      );
    }

    // Block expression
    if (this.tokenStream.isNext('punctuation', '{')) {
      return this.parseBlockExpression();
    }

    // Variable
    if (this.tokenStream.isNext('identifier')) {
      const identifierToken = this.tokenStream.next();
      if (!this.lexicalScopeProvider.hasVariableReference(identifierToken.content)) {
        throw WTCDError.atLocation(
          identifierToken,
          `Cannot locate lexical scope for variable "${identifierToken.content}"`,
        );
      }
      return this.attachLocationInfo<VariableReference>(identifierToken, {
        type: 'variableReference',
        variableName: identifierToken.content,
      });
    }

    // Unary
    if (this.tokenStream.isNext('operator')) {
      const operatorToken = this.tokenStream.next();
      if (!unaryOperators.has(operatorToken.content)) {
        throw WTCDError.atLocation(
          operatorToken,
          `Invalid unary operator: ${operatorToken.content}`,
        );
      }
      return this.attachLocationInfo<UnaryExpression>(operatorToken, {
        type: 'unaryExpression',
        operator: operatorToken.content as UnaryOperator,
        arg: this.parseExpression(
          this.parseAtom(),
          unaryOperators.get(operatorToken.content)!.precedence,
        ),
      });
    }
    if (softFail === true) {
      return null;
    } else {
      return this.tokenStream.throwUnexpectedNext('atom');
    }
  }

  private parseBlockExpression() {
    const firstBraceToken = this.tokenStream.assertAndSkipNext('punctuation', '{');
    this.lexicalScopeProvider.enterScope();
    this.lexicalScopeProvider.addRegisterToCurrentScope('yield');
    const expressions: Array<Statement> = [];
    while (!this.tokenStream.isNext('punctuation', '}')) {
      expressions.push(this.parseStatement());
    }
    this.lexicalScopeProvider.exitScope();
    this.tokenStream.assertAndSkipNext('punctuation', '}');
    return this.attachLocationInfo<BlockExpression>(firstBraceToken, {
      type: 'block',
      statements: expressions,
    });
  }

  private assertHasRegister(registerName: RegisterName, token: Token) {
    if (!this.lexicalScopeProvider.hasRegister(registerName)) {
      throw WTCDError.atLocation(
        token,
        `Cannot locate lexical scope for ${registerName} register`,
      );
    }
  }

  private parseYieldOrSetYieldExpression(): YieldStatement | SetYieldStatement {
    const yieldToken = this.tokenStream.assertAndSkipNext('keyword', 'yield');
    this.assertHasRegister('yield', yieldToken);
    if (this.tokenStream.isNext('operator', '=')) {
      // Set yield
      this.tokenStream.next();
      return this.attachLocationInfo<SetYieldStatement>(yieldToken, {
        type: 'setYield',
        value: this.parseExpression(),
      });
    } else {
      // Yield
      return this.attachLocationInfo<YieldStatement>(yieldToken, {
        type: 'yield',
        value: this.parseExpressionImpliedNull(yieldToken),
      });
    }
  }

  private parseReturnOrSetReturnStatement(): ReturnStatement | SetReturnStatement {
    const returnToken = this.tokenStream.assertAndSkipNext('keyword', 'return');
    this.assertHasRegister('return', returnToken);
    if (this.tokenStream.isNext('operator', '=')) {
      // Set return
      this.tokenStream.next();
      return this.attachLocationInfo<SetReturnStatement>(returnToken, {
        type: 'setReturn',
        value: this.parseExpression(),
      });
    } else {
      // Return
      return this.attachLocationInfo<ReturnStatement>(returnToken, {
        type: 'return',
        value: this.parseExpressionImpliedNull(returnToken),
      });
    }
  }

  private parseBreakOrSetBreakStatement(): BreakStatement | SetBreakStatement {
    const breakToken = this.tokenStream.assertAndSkipNext('keyword', 'break');
    this.assertHasRegister('break', breakToken);
    if (this.tokenStream.isNext('operator', '=')) {
      // Set return
      this.tokenStream.next();
      return this.attachLocationInfo<SetBreakStatement>(breakToken, {
        type: 'setBreak',
        value: this.parseExpression(),
      });
    } else {
      // Return
      return this.attachLocationInfo<BreakStatement>(breakToken, {
        type: 'break',
        value: this.parseExpressionImpliedNull(breakToken),
      });
    }
  }

  private parseContinueStatement(): ContinueStatement {
    return this.attachLocationInfo<ContinueStatement>(this.tokenStream.next(), {
      type: 'continue',
    });
  }

  private parseExpressionImpliedNull(location: OptionalLocationInfo) {
    const atom = this.parseAtom(true);
    if (atom === null) {
      return this.attachLocationInfo<NullLiteral>(location, { type: 'nullLiteral' });
    }
    return this.parseExpression(atom, 0);
  }

  /**
   * - If next token is not an operator, return left as is.
   * - If next operator's precedence is smaller than or equal to the precedence
   *   threshold, return left as is. (Because in this case, we want to left
   *   someone on the left wrap us.)
   * - Otherwise, for binary operators call #maybeInfixExpression with next
   *   element as left and new operator's precedence as the threshold. (This is
   *   to bind everything that binds tighter (higher precedence) than this
   *   operator together.) Using this and current precedence threshold, call
   *   #maybeInfixExpression again. (This is to bind everything that reaches the
   *   threshold together.)
   * - For conditional operator (?), parse a expression (between "?" and ":"),
   *   then read in ":". Last, do the same thing as with the binary case.
   * @param left expression on the left of next operator
   * @param precedenceMin minimum (exclusive) precedence required in order
   * to bind with left
   * @param precedenceMax minimum (inclusive) precedence required in order
   * to bind with left
   */
  private parseExpression: (
    left?: Expression,
    precedenceMin?: number,
    precedenceMax?: number,
  ) => Expression = (
    left = this.parseAtom(),
    precedenceMin = 0,
    precedenceMax = Infinity,
  ) => {
    if (!this.tokenStream.isNext('operator')) {
      return left;
    }
    const operatorToken = this.tokenStream.peek()!;
    const isConditional = operatorToken.content === '?';
    if (!isConditional && !binaryOperators.has(operatorToken.content)) {
      return left;
    }
    const nextPrecedence = isConditional
      ? conditionalOperatorPrecedence
      : binaryOperators.get(operatorToken.content)!.precedence;
    if (nextPrecedence <= precedenceMin || (isConditional && nextPrecedence > precedenceMax)) {
      return left;
    }
    this.tokenStream.next(); // Read in operator
    if (isConditional) {
      // Implementation here might contain bug. It works for all my cases though.
      const then = this.parseExpression();
      this.tokenStream.assertAndSkipNext('operator', ':');
      const otherwise = this.parseExpression(this.parseAtom(), precedenceMin, nextPrecedence);
      const conditional = this.attachLocationInfo<ConditionalExpression>(operatorToken, {
        type: 'conditionalExpression',
        condition: left,
        then,
        otherwise,
      });
      return this.parseExpression(conditional, precedenceMin, precedenceMax);
    } else {
      const right = this.parseExpression(this.parseAtom(), nextPrecedence, precedenceMax);
      const binary = this.attachLocationInfo<BinaryExpression>(operatorToken, {
        type: 'binaryExpression',
        operator: operatorToken.content as BinaryOperator,
        arg0: left,
        arg1: right,
      });
      return this.parseExpression(binary, precedenceMin, precedenceMax);
    }
  }

  /**
   * Parse a single expression, which includes:
   * - unary expressions
   * - declare expressions
   * - infix expressions (binary and conditional)
   */
  private parseStatement: () => Statement = () => {
    if (this.tokenStream.isNext('keyword', 'declare')) {
      return this.parseDeclaration();
    } else if (this.tokenStream.isNext('keyword', 'return')) {
      return this.parseReturnOrSetReturnStatement();
    } else if (this.tokenStream.isNext('keyword', 'yield')) {
      return this.parseYieldOrSetYieldExpression();
    } else if (this.tokenStream.isNext('keyword', 'break')) {
      return this.parseBreakOrSetBreakStatement();
    } else if (this.tokenStream.isNext('keyword', 'continue')) {
      return this.parseContinueStatement();
    } else {
      return this.attachLocationInfo<ExpressionStatement>(this.tokenStream.peek(), {
        type: 'expression',
        expression: this.parseExpression(),
      });
    }
  }

  private parseOneDeclaration: () => OneVariableDeclaration = () => {
    const type = this.parseVariableType();
    const variableNameToken = this.tokenStream.assertAndSkipNext('identifier');
    let initialValue: Expression | null = null;
    if (this.tokenStream.isNext('operator', '=')) {
      // Explicit initialization (number a = 123)
      this.tokenStream.next();
      initialValue = this.parseExpression();
    } else if (
      (
        (this.tokenStream.isNext('punctuation', '[')) ||
        (this.tokenStream.isNext('keyword', 'switch'))
      ) &&
      (type !== null) &&
      (type.length === 1) &&
      (type[0] === 'function')
    ) {
      // Simplified function declaration (declare function test[ ... ] ...)
      initialValue = this.attachLocationInfo<FunctionExpression>(
        variableNameToken,
        this.parseFunctionCore(true),
      );
    }
    if (this.lexicalScopeProvider.currentScopeHasVariable(variableNameToken.content)) {
      throw WTCDError.atLocation(
        variableNameToken,
        `Variable "${variableNameToken.content}" has already been declared within the same lexical scope`,
      );
    }
    this.lexicalScopeProvider.addVariableToCurrentScope(variableNameToken.content);
    return this.attachLocationInfo<OneVariableDeclaration>(variableNameToken, {
      variableName: variableNameToken.content,
      variableType: type,
      initialValue,
    });
  }

  private parseListOrSingleElement<T>(parseOneFn: () => T, atLestOne: boolean = true): Array<T> {
    if (this.tokenStream.isNext('punctuation', '[')) {
      const results: Array<T> = [];
      this.tokenStream.next(); // [
      while (!this.tokenStream.isNext('punctuation', ']')) {
        results.push(parseOneFn());
      }
      if (atLestOne && results.length === 0) {
        return this.tokenStream.throwUnexpectedNext('at least one element');
      }
      this.tokenStream.next(); // ]
      return results;
    } else {
      return [parseOneFn()];
    }
  }

  private parseDeclaration() {
    const declareToken = this.tokenStream.assertAndSkipNext('keyword', 'declare');
    const declarations = this.parseListOrSingleElement(this.parseOneDeclaration);
    return this.attachLocationInfo<DeclarationStatement>(declareToken, {
      type: 'declaration',
      declarations,
    });
  }

  private parseSection() {
    const sectionToken = this.tokenStream.assertAndSkipNext('keyword', 'section');
    const nameToken = this.tokenStream.assertAndSkipNext('identifier');
    if (this.sections.some(section => section.name === nameToken.content)) {
      throw WTCDError.atLocation(nameToken, `Cannot redefine section "${nameToken.content}"`);
    }
    let executes: Expression | null = null;
    if (!this.tokenStream.isNext('keyword', 'then')) {
      executes = this.parseExpression();
    }
    this.tokenStream.assertAndSkipNext('keyword', 'then');
    const then = this.parseExpression();
    return this.attachLocationInfo<Section>(sectionToken, {
      name: nameToken.content,
      executes,
      then,
      content: [],
    });
  }

  private parseRootBlock() {
    this.tokenStream.assertNext('keyword', ['declare', 'section']);
    if (this.tokenStream.isNext('keyword', 'declare')) {
      const declarationStatement = this.parseDeclaration();
      for (const declaration of declarationStatement.declarations) {
        this.rootDeclarations.add(declaration.variableName);
      }
      this.initStatements.push(declarationStatement);
    } else if (this.tokenStream.isNext('keyword', 'section')) {
      this.sections.push(this.parseSection());
    }
  }

  public hasRootDeclaration(variableName: string) {
    return this.rootDeclarations.has(variableName);
  }

  /**
   * Read the WTCD version declaration and verify version
   * Give warning when needed.
   */
  private parseVersion() {
    this.tokenStream.assertAndSkipNext('identifier', 'WTCD');
    const versionToken = this.tokenStream.assertAndSkipNext('number');
    const versionContent = versionToken.content;
    const split = versionContent.split('.');
    if (split.length !== 2) {
      throw WTCDError.atLocation(versionToken, `Invalid WTCD version ${versionContent}`);
    }
    const majorVersion = Number(split[0]);
    const minorVersion = Number(split[1]);
    if (
      (majorVersion > CURRENT_MAJOR_VERSION) ||
      (majorVersion === CURRENT_MAJOR_VERSION && minorVersion > CURRENT_MINOR_VERSION)
    ) {
      // If version stated is larger
      this.logger.warn(`Document's WTCD version (${versionContent}) is newer than parser ` +
        `version (${CURRENT_VERSION_STR}). New features might break parser.`);
    } else if (majorVersion < CURRENT_MAJOR_VERSION) {
      this.logger.warn(`Document's WTCD version (${versionContent}) is a least one major ` +
        `version before parser's (${CURRENT_VERSION_STR}). Breaking changes introduced might break ` +
        `parser.`);
    }
  }

  public parse() {
    const logger = this.logger;
    logger.info('Parsing logic section...');
    this.parseVersion();
    while (!this.tokenStream.eof()) {
      this.parseRootBlock();
    }
    logger.info('Run post checks...');
    this.postChecks.forEach(postCheck => postCheck());
    return {
      initStatements: this.initStatements,
      sections: this.sections,
    };
  }
}

function identity<T>(input: T) {
  return input;
}

/**
 * Parse the given WTCD document.
 */
export function parse({ source, mdi, sourceMap = false, logger = console, markdownPreProcessor = identity, htmlPostProcessor = identity }: {
  source: string;
  mdi: MDI;
  sourceMap?: boolean;
  logger?: SimpleLogger;
  markdownPreProcessor?: (markdown: string) => string;
  htmlPostProcessor?: (html: string) => string;
}): WTCDParseResult {
  try {
    // Parse sections and extract the logic part of this WTCD document

    /** Regex used to extract section headers. */
    const sectionRegex = /^---<<<\s+([a-zA-Z_][a-zA-Z_0-9]*)(?:@([0-9\-]+))?\s+>>>---$/gm;
    /** Markdown source of each section */
    const sectionMarkdowns: Array<string> = [];
    /** Name of each section, excluding bounds */
    const sectionNames: Array<string> = [];
    /** Bounds of each section, not parsed. Undefined means unbounded. */
    const sectionBounds: Array<string | undefined> = [];
    /** End index of last section */
    let lastIndex = 0;
    /** Rolling regex result object */
    let result: RegExpExecArray | null;
    while ((result = sectionRegex.exec(source)) !== null) {
      sectionMarkdowns.push(source.substring(lastIndex, result.index));
      sectionNames.push(result[1]);
      sectionBounds.push(result[2]);
      lastIndex = sectionRegex.lastIndex;
    }

    // Push the remaining content to last section's markdown
    sectionMarkdowns.push(source.substring(lastIndex));

    const logicParser = new LogicParser(
      sectionMarkdowns.shift()!,
      logger,
      sourceMap,
    );

    const wtcdRoot: WTCDRoot = logicParser.parse();

    const sig = new SimpleIdGenerator();

    sectionContentLoop:
    for (let i = 0; i < sectionMarkdowns.length; i++) {
      /** Markdown content of the section */
      const sectionMarkdown = markdownPreProcessor(sectionMarkdowns[i]);
      /** Name (without bound) of the section */
      const sectionName = sectionNames[i];
      /** Unparsed bounds of the section */
      const sectionBound = sectionBounds[i];
      const sectionFullName = (sectionBound === undefined)
        ? sectionName
        : `${sectionName}@${sectionBound}`;
      const variables: Array<{ elementClass: string, variableName: string }> = [];

      const sectionHTML = mdi.render(sectionMarkdown);

      /**
       * HTML content of the section whose interpolated values are converted to
       * spans with unique classes.
       */
      const sectionParameterizedHTML = sectionHTML.replace(/&lt;\$\s+([a-zA-Z_][a-zA-Z_0-9]*)\s+\$&gt;/g, (_, variableName) => {
        if (!logicParser.hasRootDeclaration(variableName)) {
          throw WTCDError.atUnknown(`Cannot resolve variable reference "${variableName}" in section "${sectionFullName}"`);
        }
        const elementClass = 'wtcd-variable-' + sig.next();
        variables.push({
          elementClass,
          variableName,
        });
        return `<span class="${elementClass}"></span>`;
      });

      // Parse bounds
      let lowerBound: number | undefined;
      let upperBound: number | undefined;
      if (sectionBound !== undefined) {
        if (sectionBound.includes('-')) {
          const split = sectionBound.split('-');
          lowerBound = split[0] === '' ? undefined : Number(split[0]);
          upperBound = split[1] === '' ? undefined : Number(split[1]);
        } else {
          lowerBound = upperBound = Number(sectionBound);
        }
      }
      const singleSectionContent: SingleSectionContent = {
        html: htmlPostProcessor(sectionParameterizedHTML),
        variables,
        lowerBound,
        upperBound,
      };
      for (const section of wtcdRoot.sections) {
        if (section.name === sectionName) {
          section.content.push(singleSectionContent);
          continue sectionContentLoop;
        }
      }
      // Currently, location data for content sections are not available
      throw WTCDError.atUnknown(`Cannot find a logic declaration for ` +
        `section content ${sectionFullName}`);
    }

    return {
      error: false,
      wtcdRoot,
    };
  } catch (error) {
    return {
      error: true,
      message: (error as Error).message,
      internalStack: (error as Error).stack!,
    };
  }
}

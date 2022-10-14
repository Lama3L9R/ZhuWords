// This file defines all infix and prefix operators in WTCD.

import { autoEvaluated } from './autoEvaluated';
import { getMaybePooled } from './constantsPool';
import { assignValueToVariable, describe, InterpreterHandle, isEqual, RuntimeValue, RuntimeValueRaw, RuntimeValueType } from './Interpreter';
import {pipelineInvocation, regularInvocation, regularInvocationRaw, reverseInvocation} from './invokeFunction';
import { BinaryExpression, UnaryExpression } from './types';
import { WTCDError } from './WTCDError';

export type UnaryOperator = '-' | '!';

type UnaryOperatorFn = (expr: UnaryExpression, interpreterHandle: InterpreterHandle) => RuntimeValue;

export interface UnaryOperatorDefinition {
  precedence: number;
  fn: UnaryOperatorFn;
}

export const unaryOperators = new Map<string, UnaryOperatorDefinition>([
  ['-', {
    precedence: 17,
    fn: (expr, { evaluator }) => {
      const arg = evaluator(expr.arg);
      if (arg.type !== 'number') {
        throw WTCDError.atLocation(expr, `Unary operator "-" can only be applied ` +
          `to a number, received: ${describe(arg)}`);
      }
      return getMaybePooled('number', -arg.value);
    },
  }],
  ['!', {
    precedence: 17,
    fn: (expr, { evaluator }) => {
      const arg = evaluator(expr.arg);
      if (arg.type !== 'boolean') {
        throw WTCDError.atLocation(expr, `Unary operator "!" can only be applied ` +
          `to a boolean, received: ${describe(arg)}`);
      }
      return getMaybePooled('boolean', !arg.value);
    },
  }],
]);

export type BinaryOperator = '+' | '-' | '*' | '/' | '~/' | '%' | '=' | '+=' | '-=' | '*=' | '/=' | '~/=' | '%=';

export type BinaryOperatorFn = (
  expr: BinaryExpression,
  interpreterHandle: InterpreterHandle,
) => RuntimeValue;
export interface BinaryOperatorDefinition {
  precedence: number;
  fn: BinaryOperatorFn;
}

function autoEvaluatedSameTypeArg<TArg extends RuntimeValueType, TReturn extends RuntimeValueType>(
  argType: TArg,
  returnType: TReturn,
  fn: (
    arg0Raw: RuntimeValueRaw<TArg>,
    arg1Raw: RuntimeValueRaw<TArg>,
    expr: BinaryExpression,
    interpreterHandle: InterpreterHandle,
  ) => RuntimeValueRaw<TReturn>,
): BinaryOperatorFn {
  return autoEvaluated((arg0, arg1, expr, interpreterHandle) => {
    if (arg0.type === argType && arg1.type === argType) {
      // TypeScript is not smart enough to do the conversion here
      return getMaybePooled(
        returnType,
        fn(
          arg0.value as RuntimeValueRaw<TArg>,
          arg1.value as RuntimeValueRaw<TArg>,
          expr,
          interpreterHandle,
        ),
      );
    } else {
      throw WTCDError.atLocation(expr, `Binary operator "${expr.operator}" can only be ` +
        `applied to two ${argType}s, received: ${describe(arg0)} (left) and ` +
        `${describe(arg1)} (right)`);
    }
  });
}
function opAssignment<T0 extends RuntimeValueType, T1 extends RuntimeValueType>(
  arg0Type: T0, // Type of the variable
  arg1Type: T1,
  fn: (
    arg0Raw: RuntimeValueRaw<T0>,
    arg1Raw: RuntimeValueRaw<T1>,
    expr: BinaryExpression,
    interpreterHandle: InterpreterHandle,
  ) => RuntimeValueRaw<T0>,
): BinaryOperatorFn {
  return (expr, interpreterHandle) => {
    if (expr.arg0.type !== 'variableReference') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "${expr.operator}" ` +
          `has to be a variable reference`);
    }
    const varRef = interpreterHandle.resolveVariableReference(expr.arg0.variableName);
    if (varRef.value.type !== arg0Type) {
      throw WTCDError.atLocation(expr, `Left side of binary operator "${expr.operator}" has to be a ` +
        `variable of type ${arg0Type}, actual type: ${varRef.value.type}`);
    }
    const arg1 = interpreterHandle.evaluator(expr.arg1);
    if (arg1.type !== arg1Type) {
      throw WTCDError.atLocation(expr, `Right side of binary operator "${expr.operator}" ` +
        ` has to be a ${arg1Type}, received: ${describe(arg1)}`);
    }
    const newValue = getMaybePooled(arg0Type, fn(
      varRef.value.value as RuntimeValueRaw<T0>,
      arg1.value as RuntimeValueRaw<T1>,
      expr,
      interpreterHandle,
    ));
    varRef.value = newValue;
    return newValue;
  };
}
export const binaryOperators = new Map<string, BinaryOperatorDefinition>([
  ['=', {
    precedence: 3,
    fn: (expr, { evaluator, resolveVariableReference }) => {
      if (expr.arg0.type !== 'variableReference') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "=" has to be a ` +
          `variable reference`);
      }
      const varRef = resolveVariableReference(expr.arg0.variableName);
      const arg1 = evaluator(expr.arg1);
      assignValueToVariable(varRef, arg1, expr, expr.arg0.variableName);
      return arg1;
    },
  }],
  ['+=', {
    precedence: 3,
    fn: (expr, { evaluator, resolveVariableReference }) => {
      if (expr.arg0.type !== 'variableReference') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "+=" ` +
          `has to be a variable reference`);
      }
      const varRef = resolveVariableReference(expr.arg0.variableName);
      if (varRef.value.type !== 'string' && varRef.value.type !== 'number') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "+=" has to be a ` +
          `variable of type number or string, actual type: ${varRef.value.type}`);
      }
      const arg1 = evaluator(expr.arg1);
      if (arg1.type !== varRef.value.type) {
        throw WTCDError.atLocation(expr, `Right side of binary operator "+=" has to ` +
          ` be a ${varRef.value.type}, received: ${describe(arg1)}`);
      }
      const newValue = getMaybePooled(
        varRef.value.type,
        (varRef.value.value as any) + arg1.value,
      );
      varRef.value = newValue;
      return newValue;
    },
  }],
  ['-=', {
    precedence: 3,
    fn: opAssignment('number', 'number', (arg0Raw, arg1Raw) => arg0Raw - arg1Raw),
  }],
  ['*=', {
    precedence: 3,
    fn: opAssignment('number', 'number', (arg0Raw, arg1Raw) => arg0Raw * arg1Raw),
  }],
  ['/=', {
    precedence: 3,
    fn: opAssignment('number', 'number', (arg0Raw, arg1Raw) => arg0Raw / arg1Raw),
  }],
  ['~/=', {
    precedence: 3,
    fn: opAssignment('number', 'number', (arg0Raw, arg1Raw) => Math.trunc(arg0Raw / arg1Raw)),
  }],
  ['%=', {
    precedence: 3,
    fn: opAssignment('number', 'number', (arg0Raw, arg1Raw) => arg0Raw % arg1Raw),
  }],
  ['|>', {
    precedence: 5,
    fn: pipelineInvocation,
  }],
  ['|::', {
    precedence: 5,
    fn: reverseInvocation,
  }],
  ['||', {
    precedence: 6,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type !== 'boolean') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "||" has to be a boolean. ` +
          `Received ${describe(arg0)}`);
      }
      if (arg0.value === true) {
        return getMaybePooled('boolean', true);
      }
      const arg1 = evaluator(expr.arg1); // Short-circuit evaluation
      if (arg1.type !== 'boolean') {
        throw WTCDError.atLocation(expr, `Right side of binary operator "||" has to be a boolean. ` +
          `Received ${describe(arg1)}`);
      }
      return getMaybePooled('boolean', arg1.value);
    },
  }],
  ['?!', {
    precedence: 6,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type !== 'null') {
        return arg0;
      }
      const arg1 = evaluator(expr.arg1);
      if (arg1.type === 'null') {
        throw WTCDError.atLocation(expr, `Right side of binary operator "?!" ` +
          `cannot be null. If returning null is desired in this case, please ` +
          `use "??" instead`);
      }
      return arg1;
    },
  }],
  ['??', {
    precedence: 6,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type !== 'null') {
        return arg0;
      }
      return evaluator(expr.arg1);
    },
  }],
  ['&&', {
    precedence: 7,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type !== 'boolean') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "&&" has to be a boolean. ` +
          `Received ${describe(arg0)}`);
      }
      if (arg0.value === false) {
        return getMaybePooled('boolean', false);
      }
      const arg1 = evaluator(expr.arg1); // Short-circuit evaluation
      if (arg1.type !== 'boolean') {
        throw WTCDError.atLocation(expr, `Right side of binary operator "&&" has to be a boolean. ` +
          `Received ${describe(arg1)}`);
      }
      return getMaybePooled('boolean', arg1.value);
    },
  }],
  ['==', {
    precedence: 11,
    fn: autoEvaluated((arg0, arg1) => (getMaybePooled(
      'boolean',
      isEqual(arg0, arg1),
    ))),
  }],
  ['!=', {
    precedence: 11,
    fn: autoEvaluated((arg0, arg1) => (getMaybePooled(
      'boolean',
      !isEqual(arg0, arg1),
    ))),
  }],
  ['<', {
    precedence: 12,
    fn: autoEvaluatedSameTypeArg('number', 'boolean', (arg0Raw, arg1Raw) => arg0Raw < arg1Raw),
  }],
  ['<=', {
    precedence: 12,
    fn: autoEvaluatedSameTypeArg('number', 'boolean', (arg0Raw, arg1Raw) => arg0Raw <= arg1Raw),
  }],
  ['>', {
    precedence: 12,
    fn: autoEvaluatedSameTypeArg('number', 'boolean', (arg0Raw, arg1Raw) => arg0Raw > arg1Raw),
  }],
  ['>=', {
    precedence: 12,
    fn: autoEvaluatedSameTypeArg('number', 'boolean', (arg0Raw, arg1Raw) => arg0Raw >= arg1Raw),
  }],
  ['+', {
    precedence: 14,
    fn: autoEvaluated((arg0, arg1, expr) => {
      if (arg0.type === 'number' && arg1.type === 'number') {
        return getMaybePooled(
          'number',
          arg0.value + arg1.value,
        );
      } else if (arg0.type === 'string' && arg1.type === 'string') {
        return getMaybePooled(
          'string',
          arg0.value + arg1.value,
        );
      } else {
        throw WTCDError.atLocation(expr, `Binary operator "+" can only be applied to two ` +
          `strings or two numbers, received: ${describe(arg0)} (left) and ` +
          `${describe(arg1)} (right)`);
      }
    }),
  }],
  ['-', {
    precedence: 14,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => arg0Raw - arg1Raw),
  }],
  ['*', {
    precedence: 15,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => arg0Raw * arg1Raw),
  }],
  ['/', {
    precedence: 15,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => arg0Raw / arg1Raw),
  }],
  ['~/', {
    precedence: 15,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => Math.trunc(arg0Raw / arg1Raw)),
  }],
  ['%', {
    precedence: 15,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => arg0Raw % arg1Raw),
  }],
  ['**', {
    precedence: 16,
    fn: autoEvaluatedSameTypeArg('number', 'number', (arg0Raw, arg1Raw) => arg0Raw ** arg1Raw),
  }],
  ['.', {
    precedence: 19,
    fn: autoEvaluated((arg0, arg1, expr) => {
      if (arg0.type !== 'list') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "." ` +
          `is expected to be a list. Received: ${describe(arg0)}`);
      }
      if (arg1.type !== 'number' || arg1.value % 1 !== 0) {
        throw WTCDError.atLocation(expr, `Right side of binary operator "." ` +
          `is expected to be an integer. Received: ${describe(arg1)}`);
      }
      const value = arg0.value[arg1.value];
      if (value === undefined) {
        throw WTCDError.atLocation(expr, `List does not have an element at ` +
          `${arg1.value}. If return null is desired, use ".?" instead. List ` +
          `contents: ${describe(arg0)}`);
      }
      return value;
    }),
  }],
  ['.?', {
    precedence: 19,
    fn: autoEvaluated((arg0, arg1, expr) => {
      if (arg0.type !== 'list') {
        throw WTCDError.atLocation(expr, `Left side of binary operator ".?" ` +
          `is expected to be a list. Received: ${describe(arg0)}`);
      }
      if (arg1.type !== 'number' || arg1.value % 1 !== 0) {
        throw WTCDError.atLocation(expr, `Right side of binary operator ".?" ` +
          `is expected to be an integer. Received: ${describe(arg1)}`);
      }
      const value = arg0.value[arg1.value];
      if (value === undefined) {
        return getMaybePooled('null', null);
      }
      return value;
    }),
  }],
  ['?.', {
    precedence: 19,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type === 'null') {
        return arg0; // Short circuit
      }
      if (arg0.type !== 'list') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "?." ` +
          `is expected to be a list or null. Received: ${describe(arg0)}`);
      }
      const arg1 = evaluator(expr.arg1);
      if (arg1.type !== 'number' || arg1.value % 1 !== 0) {
        throw WTCDError.atLocation(expr, `Right side of binary operator "?." ` +
          `is expected to be an integer. Received: ${describe(arg1)}`);
      }
      const value = arg0.value[arg1.value];
      if (value === undefined) {
        throw WTCDError.atLocation(expr, `List does not have an element at ` +
          `${arg1.value}. If return null is desired, use "?.?" instead. ` +
          `List contents: ${describe(arg0)}`);
      }
      return value;
    },
  }],
  ['?.?', {
    precedence: 19,
    fn: (expr, { evaluator }) => {
      const arg0 = evaluator(expr.arg0);
      if (arg0.type === 'null') {
        return arg0; // Short circuit
      }
      if (arg0.type !== 'list') {
        throw WTCDError.atLocation(expr, `Left side of binary operator "?.?" ` +
          `is expected to be a list or null. Received: ${describe(arg0)}`);
      }
      const arg1 = evaluator(expr.arg1);
      if (arg1.type !== 'number' || arg1.value % 1 !== 0) {
        throw WTCDError.atLocation(expr, `Right side of binary operator ` +
          `"?.?" is expected to be an integer. Received: ${describe(arg1)}`);
      }
      const value = arg0.value[arg1.value];
      if (value === undefined) {
        return getMaybePooled('null', null);
      }
      return value;
    },
  }],
  ['::', {
    precedence: 20,
    fn: regularInvocation,
  }],
  ['?::', {
    precedence: 20,
    fn: (expr, interpreterHandle) => {
      const { evaluator } = interpreterHandle;
      const arg0 = evaluator(expr.arg0);
      if (arg0.type === 'null') {
        return arg0; // Short circuit
      }
      return regularInvocationRaw(
        arg0,
        evaluator(expr.arg1),
        expr,
        interpreterHandle,
      );
    },
  }],
  ['.:', {
    precedence: 20,
    fn: autoEvaluated((arg0, arg1, expr) => {
      if (arg0.type !== 'function') {
        throw WTCDError.atLocation(expr, `Left side of binary operator ".:" ` +
          `is expected to be a function. Received: ${describe(arg0)}`);
      }
      if (arg1.type !== 'list') {
        throw WTCDError.atLocation(expr, `Right side of binary operator ".:" ` +
          `is expected to be a list. Received: ${describe(arg1)}`);
      }
      if (arg1.value.length === 0) {
        return arg0;
      }
      return {
        type: 'function',
        value: {
          fnType: 'partial',
          isLeft: false,
          applied: arg1.value,
          targetFn: arg0,
        },
      };
    }),
  }],
  [':.', {
    precedence: 20,
    fn: autoEvaluated((arg0, arg1, expr) => {
      if (arg0.type !== 'function') {
        throw WTCDError.atLocation(expr, `Left side of binary operator ":." ` +
          `is expected to be a function. Received: ${describe(arg0)}`);
      }
      if (arg1.type !== 'list') {
        throw WTCDError.atLocation(expr, `Right side of binary operator ":." ` +
          `is expected to be a list. Received: ${describe(arg1)}`);
      }
      if (arg1.value.length === 0) {
        return arg0;
      }
      return {
        type: 'function',
        value: {
          fnType: 'partial',
          isLeft: true,
          applied: arg1.value,
          targetFn: arg0,
        },
      };
    }),
  }],
]);

export const conditionalOperatorPrecedence = 4;

export const operators = new Set([...unaryOperators.keys(), ...binaryOperators.keys(), '?', ':', '...']);

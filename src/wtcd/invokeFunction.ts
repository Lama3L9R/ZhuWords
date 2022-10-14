import { autoEvaluated } from './autoEvaluated';
import { getMaybePooled } from './constantsPool';
import { BubbleSignal, BubbleSignalType, describe, InterpreterHandle, isTypeAssignableTo, RuntimeValue, RuntimeValueRaw } from './Interpreter';
import { NativeFunctionError } from './std/utils';
import { BinaryExpression } from './types';
import { WTCDError } from './WTCDError';

export class FunctionInvocationError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function invokeFunctionRaw(
  functionValue: RuntimeValueRaw<'function'>,
  args: ReadonlyArray<RuntimeValue>,
  interpreterHandle: InterpreterHandle,
): RuntimeValue {
  const {
    evaluator,
    pushScope,
    popScope,
  } = interpreterHandle;
  if (functionValue.fnType === 'native') {
    try {
      return functionValue.nativeFn(args, interpreterHandle);
    } catch (error) {
      if (error instanceof NativeFunctionError) {
        // Wrap up native function errors
        throw new FunctionInvocationError(`Failed to call native function ` +
          `"${functionValue.nativeFn.name}". Reason: ${error.message}`);
      } else {
        throw error;
      }
    }
  } else if (functionValue.fnType === 'wtcd') {
    const scope = pushScope();
    try {
      scope.addRegister('return');
      // Check and add arguments to the scope
      functionValue.expr.arguments.forEach((argument, index) => {
        let value = args[index];
        if (value === undefined || value.type === 'null') {
          // Use default
          if (argument.defaultValue !== null) {
            value = evaluator(argument.defaultValue);
          } else if (isTypeAssignableTo('null', argument.type)) {
            value = getMaybePooled('null', null);
          } else {
            throw new FunctionInvocationError(`The argument with index = ` +
              `${index} of invocation is omitted, but it does not have a ` +
              `default value and it does not allow null values`);
          }
        }
        if (!isTypeAssignableTo(value.type, argument.type)) {
          throw new FunctionInvocationError(`The argument with index = ` +
            `${index} of invocation has wrong type. Expected: ` +
            `${argument.type}, received: ${describe(value)}`);
        }
        scope.addVariable(argument.name, {
          types: [value.type],
          value,
        });
      });
      // Rest arg
      if (functionValue.expr.restArgName !== null) {
        scope.addVariable(
          functionValue.expr.restArgName, {
            types: ['list'],
            value: {
              type: 'list',
              value: args.slice(functionValue.expr.arguments.length),
            },
          },
        );
      }
      // Restore captured variables
      functionValue.captured.forEach(captured => {
        scope.addVariable(
          captured.name,
          captured.value,
        );
      });
      // Invoke function
      const evaluatedValue = evaluator(functionValue.expr.expression);
      const registerValue = scope.getRegister('return')!;
      // Prioritize register value
      if (registerValue.type === 'null') {
        // Only use evaluated value if no return or setReturn statement is
        // executed.
        return evaluatedValue;
      } else {
        return registerValue;
      }
    } catch (error) {
      if (
        (error instanceof BubbleSignal) &&
        (error.type === BubbleSignalType.RETURN)
      ) {
        return scope.getRegister('return')!;
      }
      throw error;
    } finally {
      popScope();
    }
  } else {
    let fn: RuntimeValueRaw<'function'> = functionValue;
    const leftApplied = [];
    const rightApplied = [];
    do {
      if (fn.isLeft) {
        leftApplied.unshift(...fn.applied);
      } else {
        rightApplied.push(...fn.applied);
      }
      fn = fn.targetFn.value;
    } while (fn.fnType === 'partial');
    return invokeFunctionRaw(
      fn,
      [...leftApplied, ...args, ...rightApplied],
      interpreterHandle,
    );
  }
}

function handleError(expr: BinaryExpression, error: any): never {
  if (error instanceof FunctionInvocationError) {
    throw WTCDError.atLocation(expr, error.message);
  } else if (error instanceof WTCDError) {
    error.pushWTCDStack(`"${expr.operator}" invocation`, expr);
  }
  throw error;
}

export const regularInvocationRaw = (
  arg0: RuntimeValue,
  arg1: RuntimeValue,
  expr: BinaryExpression,
  interpreterHandle: InterpreterHandle,
) => {
  if (arg0.type !== 'function') {
    throw WTCDError.atLocation(expr, `Left side of function invocation ` +
      `"${expr.operator}" is expected to be a function, received: ` +
      `${describe(arg0)}`);
  }
  if (arg1.type !== 'list') {
    throw WTCDError.atLocation(expr, `Right side of function invocation ` +
      `"${expr.operator}" is expected to be a list, received: ` +
      `${describe(arg1)}`);
  }
  try {
    return invokeFunctionRaw(arg0.value, arg1.value, interpreterHandle);
  } catch (error) {
    return handleError(expr, error);
  }
};

export const regularInvocation = autoEvaluated(regularInvocationRaw);

export const pipelineInvocation = autoEvaluated((
  arg0,
  arg1,
  expr,
  interpreterHandle,
) => {
  if (arg1.type !== 'function') {
    throw WTCDError.atLocation(expr, `Right side of pipeline invocation "|>" ` +
      `is expected to be a function, received: ${describe(arg1)}`);
  }
  try {
    return invokeFunctionRaw(arg1.value, [ arg0 ], interpreterHandle);
  } catch (error) {
    return handleError(expr, error);
  }
});

export const reverseInvocation = autoEvaluated((
  arg0,
  arg1,
  expr,
  interpreterHandle,
) => {
  if (arg0.type !== 'list') {
    throw WTCDError.atLocation(expr, `Left side of reverse invocation "|::" ` +
      `is expected to be a list, received: ${describe(arg0)}`);
  }
  if (arg1.type !== 'function') {
    throw WTCDError.atLocation(expr, `Right side of reverse invocation "|::" ` +
      `is expected to be a function, received: ${describe(arg1)}`);
  }
  try {
    return invokeFunctionRaw(arg1.value, arg0.value, interpreterHandle);
  } catch (error) {
    return handleError(expr, error);
  }
});

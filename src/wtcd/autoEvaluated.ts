import { InterpreterHandle, RuntimeValue } from './Interpreter';
import { BinaryOperatorFn } from './operators';
import { BinaryExpression } from './types';
export function autoEvaluated(fn: (
  arg0: RuntimeValue,
  arg1: RuntimeValue,
  expr: BinaryExpression,
  interpreterHandle: InterpreterHandle,
) => RuntimeValue): BinaryOperatorFn {
  return (expr, interpreterHandle) => {
    const arg0 = interpreterHandle.evaluator(expr.arg0);
    const arg1 = interpreterHandle.evaluator(expr.arg1);
    return fn(arg0, arg1, expr, interpreterHandle);
  };
}

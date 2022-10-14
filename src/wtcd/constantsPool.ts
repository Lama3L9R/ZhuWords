import { BooleanValue, NullValue, NumberValue, RuntimeValue, RuntimeValueRaw, RuntimeValueType, Variable } from './Interpreter';

// Your typical immature optimization
// Caches null values, boolean values, and small integers to somewhat reduce GC

export const nullValue: NullValue = { type: 'null', value: null };
export const trueValue: BooleanValue = { type: 'boolean', value: true };
export const falseValue: BooleanValue = { type: 'boolean', value: false };
export const smallIntegers: Array<NumberValue> = [];
for (let i = 0; i <= 100; i++ ) {
  smallIntegers.push({
    type: 'number',
    value: i,
  });
}
export function booleanValue(value: boolean) {
  return value ? trueValue : falseValue;
}
export function getMaybePooled<T extends RuntimeValueType>(
  type: T,
  value: RuntimeValueRaw<T>,
): Extract<RuntimeValue, { type: T }> {
  if (type === 'null') {
    return nullValue as any;
  }
  if (type === 'boolean') {
    return booleanValue(value as boolean) as any;
  }
  if (type === 'number' && (value as number) >= 0 && (value as number) <= 100 && ((value as number) % 1 === 0)) {
    return smallIntegers[value as number] as any;
  }
  return {
    type,
    value,
  } as any;
}

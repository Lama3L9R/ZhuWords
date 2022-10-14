import { getMaybePooled } from '../constantsPool';
import { NativeFunction } from '../types';
import { assertArgsLength, assertArgType, NativeFunctionError } from './utils';

export const stringStdFunctions: Array<NativeFunction> = [
  function stringLength(args) {
    assertArgsLength(args, 1);
    const str = assertArgType(args, 0, 'string');
    return getMaybePooled('number', str.length);
  },
  function stringFormatNumberFixed(args) {
    assertArgsLength(args, 1, 2);
    const num = assertArgType(args, 0, 'number');
    const digits = assertArgType(args, 1, 'number', 0);
    if (digits < 0 || digits > 100 || digits % 1 !== 0) {
      throw new NativeFunctionError('Digits must be an integer between 0 and ' +
        `100, received: ${digits}`);
    }
    return getMaybePooled('string', num.toFixed(digits));
  },
  function stringFormatNumberPrecision(args) {
    assertArgsLength(args, 2);
    const num = assertArgType(args, 0, 'number');
    const digits = assertArgType(args, 1, 'number');
    if (digits < 1 || digits > 100 || digits % 1 !== 0) {
      throw new NativeFunctionError('Digits must be an integer between 1 and ' +
        `100, received: ${digits}`);
    }
    return getMaybePooled('string', num.toPrecision(digits));
  },
  function stringSplit(args) {
    assertArgsLength(args, 2);
    const str = assertArgType(args, 0, 'string');
    const separator = assertArgType(args, 1, 'string');
    return getMaybePooled(
      'list',
      str.split(separator).map(str => getMaybePooled('string', str)),
    );
  },
  function stringSubByLength(args) {
    assertArgsLength(args, 2, 3);
    const str = assertArgType(args, 0, 'string');
    const startIndex = assertArgType(args, 1, 'number');
    const length = assertArgType(args, 2, 'number', str.length - startIndex);
    if (startIndex < 0 || startIndex % 1 !== 0) {
      throw new NativeFunctionError(`Start index must be an nonnegative ` +
        `integer, received: ${startIndex}`);
    }
    if (startIndex > str.length) {
      throw new NativeFunctionError(`Start cannot be larger than str length. ` +
        `startIndex=${startIndex}, str length=${str.length}`);
    }
    if (length < 0 || length % 1 !== 0) {
      throw new NativeFunctionError(`Length must be an nonnegative integer ` +
        `, received: ${length}`);
    }
    if (startIndex + length > str.length) {
      throw new NativeFunctionError(`Index out of bounds. ` +
        `startIndex=${startIndex}, length=${length}, ` +
        `str length=${str.length}.`);
    }
    return getMaybePooled('string', str.substr(startIndex, length));
  },
  function stringSubByIndex(args) {
    assertArgsLength(args, 2, 3);
    const str = assertArgType(args, 0, 'string');
    const startIndex = assertArgType(args, 1, 'number');
    const endIndexExclusive = assertArgType(args, 2, 'number', str.length);
    if (startIndex < 0 || startIndex % 1 !== 0) {
      throw new NativeFunctionError(`Start index must be an nonnegative ` +
        `integer, received: ${startIndex}`);
    }
    if (startIndex > str.length) {
      throw new NativeFunctionError(`Start cannot be larger than str length. ` +
        `startIndex=${startIndex}, str length=${str.length}`);
    }
    if (endIndexExclusive < 0 || endIndexExclusive % 1 !== 0) {
      throw new NativeFunctionError(`End index must be an nonnegative ` +
        `integer, received: ${endIndexExclusive}`);
    }
    if (endIndexExclusive < startIndex || endIndexExclusive > str.length) {
      throw new NativeFunctionError(`End index cannot be smaller than start ` +
        `index nor larger than the length of str. ` +
        `endIndex=${endIndexExclusive}, startIndex=${startIndex}, ` +
        `str length=${str.length}`);
    }
    return getMaybePooled('string', str.substring(startIndex, endIndexExclusive));
  },
];

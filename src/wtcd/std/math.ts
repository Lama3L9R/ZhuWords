import { getMaybePooled } from '../constantsPool';
import { NativeFunction } from '../types';
import { assertArgsLength, assertArgType } from './utils';

export const mathStdFunctions: Array<NativeFunction> = [
  function mathMin(args) {
    assertArgsLength(args, 1, Infinity);
    let min = Infinity;
    for (let i = 0; i < args.length; i++) {
      const value = assertArgType(args, i, 'number');
      if (value < min) {
        min = value;
      }
    }
    return getMaybePooled('number', min);
  },
  function mathMax(args) {
    assertArgsLength(args, 1, Infinity);
    let max = -Infinity;
    for (let i = 0; i < args.length; i++) {
      const value = assertArgType(args, i, 'number');
      if (value > max) {
        max = value;
      }
    }
    return getMaybePooled('number', max);
  },
  function mathFloor(args) {
    assertArgsLength(args, 1);
    return getMaybePooled(
      'number',
      Math.floor(assertArgType(args, 0, 'number')),
    );
  },
  function mathCeil(args) {
    assertArgsLength(args, 1);
    return getMaybePooled(
      'number',
      Math.ceil(assertArgType(args, 0, 'number')),
    );
  },
];

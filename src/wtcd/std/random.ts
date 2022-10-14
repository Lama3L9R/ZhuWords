import { getMaybePooled } from '../constantsPool';
import { NativeFunction } from '../types';
import { assertArgsLength, assertArgType, NativeFunctionError } from './utils';

export const randomStdFunctions: Array<NativeFunction> = [
  function random(args, interpreterHandle) {
    assertArgsLength(args, 0, 2);
    const low = assertArgType(args, 0, 'number', 0);
    const high = assertArgType(args, 1, 'number', 1);
    return {
      type: 'number',
      value: interpreterHandle.getRandom().next(low, high),
    };
  },
  function randomInt(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const low = assertArgType(args, 0, 'number');
    const high = assertArgType(args, 1, 'number');
    return getMaybePooled(
      'number',
      interpreterHandle.getRandom().nextInt(low, high),
    );
  },
  function randomBoolean(args, interpreterHandle) {
    assertArgsLength(args, 0, 1);
    const trueChance = assertArgType(args, 0, 'number', 0.5);
    return getMaybePooled(
      'boolean',
      interpreterHandle.getRandom().next() < trueChance,
    );
  },
  function randomBiased(args, interpreterHandle) {
    assertArgsLength(args, 0, 4);
    const low = assertArgType(args, 0, 'number', 0);
    const high = assertArgType(args, 1, 'number', 1);
    const bias = assertArgType(args, 2, 'number', (low + high) / 2);
    const influence = assertArgType(args, 3, 'number', 4);
    if (low >= high) {
      throw new NativeFunctionError('Low cannot be larger than or equal to ' +
        'high.');
    }
    if (bias < low || bias > high) {
      throw new NativeFunctionError('Bias has to be between low and high.');
    }
    let norm: number;
    do {
      // https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
      norm = bias + (high - low) / influence * Math.sqrt(
        (-2) *
        Math.log(interpreterHandle.getRandom().next())) *
        Math.cos(2 * Math.PI * interpreterHandle.getRandom().next());
    } while (norm < low || norm >= high);
    return {
      type: 'number',
      value: norm,
    };
  },

];

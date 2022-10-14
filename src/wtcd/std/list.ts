import { getMaybePooled } from '../constantsPool';
import { describe, isEqual, ListValue } from '../Interpreter';
import { FunctionInvocationError, invokeFunctionRaw } from '../invokeFunction';
import { NativeFunction } from '../types';
import { WTCDError } from '../WTCDError';
import { assertArgsLength, assertArgType, NativeFunctionError } from './utils';

export const listStdFunctions: Array<NativeFunction> = [
  function listSet(args) {
    assertArgsLength(args, 3);
    const list = assertArgType(args, 0, 'list');
    const index = assertArgType(args, 1, 'number');
    const value = args[2];
    if (index % 1 !== 0) {
      throw new NativeFunctionError(`Index (${index}) has to be an integer`);
    }
    if (index < 0) {
      throw new NativeFunctionError(`Index (${index}) cannot be negative`);
    }
    if (index >= list.length) {
      throw new NativeFunctionError(`Index (${index}) out of bounds. List ` +
        `length is ${list.length}`);
    }
    const newList = list.slice();
    newList[index] = value;
    return {
      type: 'list',
      value: newList,
    };
  },
  function listForEach(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    const fn = assertArgType(args, 1, 'function');
    list.forEach((element, index) => {
      try {
        invokeFunctionRaw(fn, [
          element,
          getMaybePooled('number', index),
        ], interpreterHandle);
      } catch (error) {
        if (error instanceof FunctionInvocationError) {
          throw new NativeFunctionError(`Failed to apply function to the ` +
            `element with index = ${index} of list: ${error.message}`);
        } else if (error instanceof WTCDError) {
          error.pushWTCDStack(`listForEach (index = ${index})`);
        }
        throw error;
      }
    });
    return getMaybePooled('null', null);
  },
  function listMap(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    const fn = assertArgType(args, 1, 'function');
    const result = list.map((element, index) => {
      try {
        return invokeFunctionRaw(fn, [
          element,
          getMaybePooled('number', index),
        ], interpreterHandle);
      } catch (error) {
        if (error instanceof FunctionInvocationError) {
          throw new NativeFunctionError(`Failed to apply function to the ` +
            `element with index = ${index} of list: ${error.message}`);
        } else if (error instanceof WTCDError) {
          error.pushWTCDStack(`listForMap (index = ${index})`);
        }
        throw error;
      }
    });
    return {
      type: 'list',
      value: result,
    };
  },
  function listCreateFilled(args) {
    assertArgsLength(args, 1, 2);
    const length = assertArgType(args, 0, 'number');
    const value = args.length === 1
      ? getMaybePooled('null', null)
      : args[1];
    if (length % 1 !== 0) {
      throw new NativeFunctionError(`Length (${length}) has to be an integer.`);
    }
    if (length < 0) {
      throw new NativeFunctionError(`Length (${length}) cannot be negative.`);
    }
    const list = new Array(length).fill(value);
    return {
      type: 'list',
      value: list,
    };
  },
  function listChunk(args) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    const chunkSize = assertArgType(args, 1, 'number');
    if (chunkSize % 1 !== 0 || chunkSize < 1) {
      throw new NativeFunctionError(`Chunk size (${chunkSize} has to be a ` +
        `positive integer.`);
    }
    const results: Array<ListValue> = [];
    for (let i = 0; i < list.length; i += chunkSize) {
      results.push({
        type: 'list',
        value: list.slice(i, i + chunkSize),
      });
    }
    return {
      type: 'list',
      value: results,
    };
  },
  function listFilter(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    const fn = assertArgType(args, 1, 'function');
    return {
      type: 'list',
      value: list.filter((item, index) => {
        try {
          const result = invokeFunctionRaw(fn, [
            item,
            getMaybePooled('number', index),
          ], interpreterHandle);
          if (result.type !== 'boolean') {
            throw new NativeFunctionError(`Predicate is expected to return ` +
              `booleans, but ${describe(result)} is returned for element ` +
              `with index = ${index}`);
          }
          return result.value;
        } catch (error) {
          if (error instanceof FunctionInvocationError) {
            throw new NativeFunctionError(`Failed to apply function to the ` +
              `element with index = ${index} of list: ${error.message}`);
          } else if (error instanceof WTCDError) {
            error.pushWTCDStack(`listFilter (index = ${index})`);
          }
          throw error;
        }
      }),
    };
  },
  function listSplice(args) {
    assertArgsLength(args, 3, 4);
    const source = assertArgType(args, 0, 'list');
    const start = assertArgType(args, 1, 'number');
    const length = assertArgType(args, 2, 'number');
    const newItems = assertArgType(args, 3, 'list', []);
    if (start % 1 !== 0) {
      throw new NativeFunctionError('Start index must be an integer, ' +
        `provided: ${start}`);
    }
    if (start < 0 || start > source.length) {
      throw new NativeFunctionError(`Start index must be in the bounds of ` +
        `the list given (0 - ${source.length}), provided: ${start}`);
    }
    if (length % 1 !== 0) {
      throw new NativeFunctionError('Start must be an integer.');
    }
    if (length < 0) {
      throw new NativeFunctionError('Length must be nonnegative.');
    }
    if ((start + length) > source.length) {
      throw new NativeFunctionError(`Length is too large and causes overflow.`);
    }
    const result = source.slice();
    result.splice(start, length, ...newItems);
    return {
      type: 'list',
      value: result,
    };
  },
  function listSlice(args) {
    assertArgsLength(args, 2, 3);
    const source = assertArgType(args, 0, 'list');
    const start = assertArgType(args, 1, 'number');
    const end = assertArgType(args, 2, 'number', source.length);
    if (start % 1 !== 0) {
      throw new NativeFunctionError('Start index must be an integer, ' +
        `provided: ${start}`);
    }
    if (start < 0 || start > source.length) {
      throw new NativeFunctionError(`Start index must be in the bounds of ` +
        `the list given (0 - ${source.length}), provided: ${start}`);
    }
    if (end % 1 !== 0) {
      throw new NativeFunctionError('End index must be an integer, ' +
        `provided: ${end}`);
    }
    if (end < 0 || end > source.length) {
      throw new NativeFunctionError(`End index must be in the bounds of ` +
        `the list given (0 - ${source.length}), provided: ${end}`);
    }
    if (end < start) {
      throw new NativeFunctionError(`End index must be larger or equal to ` +
        `start index. Provided start = ${start}, end = ${end}`);
    }
    return {
      type: 'list',
      value: source.slice(start, end),
    };
  },
  function listLength(args) {
    assertArgsLength(args, 1);
    return getMaybePooled('number', assertArgType(args, 0, 'list').length);
  },
  function listIndexOf(args) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    for (let i = 0; i < list.length; i++) {
      if (isEqual(list[i], args[1])) {
        return getMaybePooled('number', i);
      }
    }
    return getMaybePooled('number', -1);
  },
  function listIncludes(args) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    return getMaybePooled(
      'boolean',
      list.some(item => isEqual(item, args[1])),
    );
  },
  function listFindIndex(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const list = assertArgType(args, 0, 'list');
    const fn = assertArgType(args, 1, 'function');
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      try {
        const result = invokeFunctionRaw(fn, [
          item,
          getMaybePooled('number', i),
        ], interpreterHandle);
        if (result.type !== 'boolean') {
          throw new NativeFunctionError(`Predicate is expected to return ` +
            `booleans, but ${describe(result)} is returned for element ` +
            `with index = ${i}`);
        }
        if (result.value) {
          return getMaybePooled('number', i);
        }
      } catch (error) {
        if (error instanceof FunctionInvocationError) {
          throw new NativeFunctionError(`Failed to apply function to the ` +
            `element with index = ${i} of list: ${error.message}`);
        } else if (error instanceof WTCDError) {
          error.pushWTCDStack(`listFindIndex (index = ${i})`);
        }
        throw error;
      }
    }
    return getMaybePooled('number', -1);
  },
];

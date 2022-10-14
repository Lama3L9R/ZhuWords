import { getMaybePooled } from '../constantsPool';
import { FunctionValue } from '../Interpreter';
import { NativeFunction } from '../types';
import { assertArgsLength, assertArgType } from './utils';

export const readerStdFunctions: Array<NativeFunction> = [
  function readerSetPinned(args, interpreterHandle) {
    assertArgsLength(args, 1);
    assertArgType(args, 0, 'function');
    interpreterHandle.setPinnedFunction(args[0] as FunctionValue);
    return getMaybePooled('null', null);
  },
  function readerUnsetPinned(args, interpreterHandle) {
    assertArgsLength(args, 0);
    interpreterHandle.setPinnedFunction(null);
    return getMaybePooled('null', null);
  },
  function readerSetStateDesc(args, interpreterHandle) {
    assertArgsLength(args, 1);
    const stateDesc = assertArgType(args, 0, 'string');
    interpreterHandle.setStateDesc(stateDesc);
    return getMaybePooled('null', null);
  },
  function readerUnsetStateDesc(args, interpreterHandle) {
    assertArgsLength(args, 0);
    interpreterHandle.setStateDesc(null);
    return getMaybePooled('null', null);
  },
];

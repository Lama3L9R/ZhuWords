import { contentStdFunctions } from './content';
import { debugStdFunctions } from './debug';
import { listStdFunctions } from './list';
import { mathStdFunctions } from './math';
import { randomStdFunctions } from './random';
import { readerStdFunctions } from './reader';
import { stringStdFunctions } from './string';
import { canvasStdFunctions } from './canvas';

export const stdFunctions = [
  ...contentStdFunctions,
  ...debugStdFunctions,
  ...listStdFunctions,
  ...mathStdFunctions,
  ...randomStdFunctions,
  ...readerStdFunctions,
  ...stringStdFunctions,
  ...canvasStdFunctions,
];

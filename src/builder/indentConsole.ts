import { relative } from 'path';
import { rootDir } from './dirs';
import * as colorworks from 'colorworks';

const cw = colorworks.create();

const notLastIndent = cw.compile('[[gray| │  ]]');
const lastIndent = cw.compile('[[gray| ├─╴]]');

let indentation = 0;
export function indent() {
  indentation++;
}
export function dedent() {
  indentation--;
}
export function log(msg?: string) {
  if (msg === undefined) {
    console.info();
    return;
  }
  console.info(notLastIndent.repeat(Math.max(0, indentation - 1))
    + (indentation > 0 ? lastIndent : '') + cw.compile(msg));
}
/** Format path */
export function fPath(path: string) {
  return relative(rootDir, path).replace(/\\/g, '/');
}

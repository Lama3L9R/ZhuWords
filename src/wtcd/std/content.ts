import { getMaybePooled } from '../constantsPool';
import { describe } from '../Interpreter';
import { NativeFunction } from '../types';
import { assertArgsLength, assertArgType, NativeFunctionError } from './utils';

export const contentStdFunctions: Array<NativeFunction> = [
  function contentAddParagraph(args, interpreterHandle) {
    assertArgsLength(args, 1);
    const $paragraph = document.createElement('p');
    $paragraph.innerText = assertArgType(args, 0, 'string');
    interpreterHandle.pushContent($paragraph);
    return getMaybePooled('null', null);
  },
  function contentAddImage(args, interpreterHandle) {
    assertArgsLength(args, 1);
    const $image = document.createElement('img');
    $image.src = assertArgType(args, 0, 'string');
    interpreterHandle.pushContent($image);
    return getMaybePooled('null', null);
  },
  function contentAddUnorderedList(args, interpreterHandle) {
    const $container = document.createElement('ul');
    for (let i = 0; i < args.length; i++) {
      const content = assertArgType(args, i, 'string');
      const $li = document.createElement('li');
      $li.innerText = content;
      $container.appendChild($li);
    }
    interpreterHandle.pushContent($container);
    return getMaybePooled('null', null);
  },
  function contentAddOrderedList(args, interpreterHandle) {
    const $container = document.createElement('ol');
    for (let i = 0; i < args.length; i++) {
      const content = assertArgType(args, i, 'string');
      const $li = document.createElement('li');
      $li.innerText = content;
      $container.appendChild($li);
    }
    interpreterHandle.pushContent($container);
    return getMaybePooled('null', null);
  },
  function contentAddHeader(args, interpreterHandle) {
    assertArgsLength(args, 1, 2);
    const level = assertArgType(args, 1, 'number', 1);
    if (![1, 2, 3, 4, 5, 6].includes(level)) {
      throw new NativeFunctionError(`There is no header with level ${level}`);
    }
    const $header = document.createElement('h' + level);
    $header.innerText = assertArgType(args, 0, 'string');
    interpreterHandle.pushContent($header);
    return getMaybePooled('null', null);
  },
  function contentAddTable(args, interpreterHandle) {
    assertArgsLength(args, 1, Infinity);
    const rows = args
      .map((_, index) => assertArgType(args, index, 'list'));
    rows.forEach((row, rowIndex) => {
      if (row.length !== rows[0].length) {
        throw new NativeFunctionError(`Row with index = ${rowIndex} has ` +
          `incorrect number of items. Expecting ${rows[0].length}, received ` +
          `${row.length}`);
      }
      row.forEach((item, columnIndex) => {
        if (item.type !== 'string') {
          throw new NativeFunctionError(`Item in row with index = ${rowIndex}` +
            `, and column with index = ${columnIndex} is expected to be a ` +
            `string, received: ${describe(item)}`);
        }
      });
    });
    const $table = document.createElement('table');
    const $thead = document.createElement('thead');
    const $headTr = document.createElement('tr');
    const headerRow = rows.shift()!;
    headerRow.forEach(content => {
      const $th = document.createElement('th');
      $th.innerText = content.value as string;
      $headTr.appendChild($th);
    });
    $thead.appendChild($headTr);
    $table.appendChild($thead);
    const $tbody = document.createElement('tbody');
    rows.forEach(row => {
      const $tr = document.createElement('tr');
      row.forEach(content => {
        const $td = document.createElement('td');
        $td.innerText = content.value as string;
        $tr.appendChild($td);
      });
      $tbody.appendChild($tr);
    });
    $table.appendChild($tbody);
    interpreterHandle.pushContent($table);
    return getMaybePooled('null', null);
  },
  function contentAddHorizontalRule(args, interpreterHandle) {
    assertArgsLength(args, 0);
    interpreterHandle.pushContent(document.createElement('hr'));
    return getMaybePooled('null', null);
  },
];

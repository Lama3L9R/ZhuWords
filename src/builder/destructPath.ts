import { basename, relative } from 'path';
import { DisplayIndex } from '../Data';
import { chaptersDir } from './dirs';

function removeExtension(name: string) {
  if (name.includes('.')) {
    name = name.substr(0, name.lastIndexOf('.'));
  }
  return name;
}

const displayIndexRegex = /^(?:[1-9][0-9]*|0)(?:\.(?:[1-9][0-9]*|0))*$/;
function parseDisplayIndex(specifier: string): DisplayIndex {
  if (!displayIndexRegex.test(specifier)) {
    throw new Error(`Invalid display index specifier: "${specifier}".`);
  }
  return specifier.split('.').map(segment => {
    const num = +segment;
    if (num > Number.MAX_SAFE_INTEGER) {
      throw new Error(`The segment "${segment}" is too large.`);
    }
    return num;
  });
}

// Get basic displayName, displayIndex, name, relativePath from a full path
export function destructPath(fullPath: string): {
  displayName: string,
  displayIndex: DisplayIndex,
  sourceRelativePath: string,
} {
  const relativePath = relative(chaptersDir, fullPath);

  if (relativePath === '') {
    // Root
    return {
      displayName: '',
      displayIndex: [0],
      sourceRelativePath: relativePath,
    };
  }

  const name = basename(relativePath);

  let displayName;
  let displayIndex;

  const separatorIndex = name.indexOf(' - ');
  if (separatorIndex === -1) {
    displayIndex = parseDisplayIndex(removeExtension(name));
    displayName = `第 ${displayIndex} 章`;
  } else {
    displayIndex = parseDisplayIndex(name.substr(0, separatorIndex));
    displayName = removeExtension(name.substr(separatorIndex + 3));
  }

  return {
    displayName,
    displayIndex,
    sourceRelativePath: relativePath,
  };
}

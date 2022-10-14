/**
 * Input: ['a/b', '..', 'c/../e', 'f']
 * Output: 'a/e/f'
 */
export function resolvePath(...paths: Array<string>) {
  const pathStack: Array<string> = [];
  for (const path of paths) {
    const segments = path.split('/');
    for (const segment of segments) {
      switch (segment) {
        case '':
        case '.':
          return null;
        case '..':
          if (pathStack.length === 0) {
            return null;
          } else {
            pathStack.pop();
          }
          break;
        default:
          pathStack.push(segment);
      }
    }
  }
  return pathStack.join('/');
}

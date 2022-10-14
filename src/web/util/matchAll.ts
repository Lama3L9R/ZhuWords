export function matchAll(str: string, regex: RegExp): Array<RegExpExecArray> {
  if (regex.global !== true) {
    throw new Error('Global flag is required.');
  }
  const results = [];
  let array;
  while ((array = regex.exec(str)) !== null) {
    results.push(array);
  }
  return results;
}

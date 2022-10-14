export function flat<T>(arr: ReadonlyArray<T | ReadonlyArray<T>>) {
  const result: Array<T> = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...item);
    } else {
      result.push(item);
    }
  }
  return result;
}
export function arrayEquals<T>(
  arr0: ReadonlyArray<T>,
  arr1: ReadonlyArray<T>,
  comparator: (e0: T, e1: T) => boolean = (e0, e1) => e0 === e1,
) {
  return (arr0.length === arr1.length) && arr0.every((e0, index) => comparator(e0, arr1[index]));
}

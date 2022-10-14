export function lastElement<T>(array: Array<T>): T {
  return array[array.length - 1];
}

export function range(fromInclusive: number, toExclusive: number, step: number = 1) {
  const result: Array<number> = [];
  for (let i = fromInclusive; i < toExclusive; i += step) {
    result.push(i);
  }
  return result;
}

export function produce<T>(count: number, producer: () => T) {
  const result: Array<T> = [];
  for (let i = 0; i < count; i++) {
    result.push(producer());
  }
  return result;
}

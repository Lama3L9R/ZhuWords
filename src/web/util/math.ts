export function randomInt(minInclusive: number, maxExclusive: number) {
  return Math.floor(Math.random() * (maxExclusive - minInclusive)) + minInclusive;
}

export function randomNumber(minInclusive: number, maxExclusive: number) {
  return Math.random() * (maxExclusive - minInclusive) + minInclusive;
}

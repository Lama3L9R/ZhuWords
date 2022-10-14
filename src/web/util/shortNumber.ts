export function shortNumber(input: number, digits: number = 1) {
  if (input < 1_000) {
    return String(input);
  }
  if (input < 1_000_000) {
    return (input / 1000).toFixed(digits) + 'k';
  }
  return (input / 1_000_000).toFixed(digits) + 'M';
}

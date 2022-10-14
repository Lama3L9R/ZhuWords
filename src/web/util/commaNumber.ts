export function commaNumber(num: number) {
  const segments: Array<string> = [];
  while (num >= 1000) {
    segments.push(String(num % 1000).padStart(3, '0'));
    num = Math.floor(num / 1000);
  }
  segments.push(String(num));
  segments.reverse();
  return segments.join(',');
}

/**
 * Input: 'asdasd.html', '.html'
 * Output: 'asdasd'
 *
 * Input: 'asdasd', '.html'
 * Output: 'asdasd'
 */
export function removePotentialSuffix(input: string, potentialSuffix: string) {
  return input.endsWith(potentialSuffix)
    ? input.substr(0, input.length - potentialSuffix.length)
    : input;
}

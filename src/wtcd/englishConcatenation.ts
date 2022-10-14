export function englishConcatenation(strings: Array<string>, relation = 'or') {
  switch (strings.length) {
    case 0: return '';
    case 1: return strings[0];
    case 2: return `${strings[0]} ${relation} ${strings[1]}`;
    default: return strings
      .slice()
      .splice(-1, 1, `${relation} ${strings[strings.length - 1]}`)
      .join(', ');
  }
}

import * as Unistring from 'unistring';

const ignoredTypes = new Set([6, 7, 26]);
export function countChars(markdown: string) {
  // JavaScript 的 string 其实是 UTF-16 序列，并且无法正常处理 Grapheme Cluster。
  // 因此我们使用 Unistring 这个库来做能够正确处理 Unicode 的字数统计。
  //
  // 在中文中，字数统计统计的是汉字的数量，而在英文中，统计的是词的数量。
  // 因为《可穿戴科技》同时含有英文和中文，我们需要能够同时正确处理中文和英文。
  // 因此，我们使用 Unistring 提供的 getWords 方法。这个方法会把输入的字符串根据
  // Unicode 规定的分词方案分割成一个词语数组。需要注意的是，Unicode 的分词方案
  // 并不会处理中文的分词，而是将每一个中文汉字当成一个单独的词语。恰好，这正是
  // 我们需要的。

  return Unistring.getWords(markdown)
    // 这里过滤掉空格和换行
    .filter((word: any) => !ignoredTypes.has(word.type))
    .length;
}

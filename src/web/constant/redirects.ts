// ! NOTE: Redirects are only applied after the path fails to match

export const redirects: Array<(input: string) => string> = [
  input => input.replace(/^chapter\/人设卡\/(.*)$/, 'chapter/主线/人设卡/$1'),
  input => input.replace(/^chapter\/支线\/(.*)$/, 'chapter/$1'),
  input => input.replace(/^menu\/章节选择\/所有章节\/支线\/(.*)$/, 'menu/章节选择/所有章节/$1'),
  input => {
    if (input.startsWith('chapter/') && input.endsWith('.html') && !input.endsWith('第-1-章.html')) {
      return input.replace(/^(chapter\/.*)\.html$/, '$1/第-1-章.html');
    } else {
      return input;
    }
  },
];


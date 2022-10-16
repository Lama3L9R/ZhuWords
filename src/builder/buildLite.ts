import escapeHTML = require('escape-html');
import { ensureDir, readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import { Data, Folder, Node } from '../Data';
import { distDir, distLiteDir, templatesDir } from './dirs';

function formatRelativePath(relativePath: string) {
  if (relativePath.endsWith('.html')) {
    relativePath = relativePath.substr(0, relativePath.length - '.html'.length);
  }
  relativePath = relativePath.replace(/\//g, ' ');
  relativePath = relativePath.replace(/-/g, ' ');
  return relativePath;
}


export async function buildLite(data: Data) {
  await ensureDir(join(distLiteDir, 'chapters'));

  const entryTemplate = await readFile(join(templatesDir, 'lite', 'entry.html'), 'utf8');
  const chapterTemplate = await readFile(join(templatesDir, 'lite', 'chapter.html'), 'utf8');

  function checkNodeAbandoned(node: Node): boolean {
    if (node.type === 'folder') {
      return node.children.every(checkNodeAbandoned);
    } else {
      return node.abandoned ?? false;
    }
  }

  function buildChapterTreeHTML() {
    const output: Array<string> = [];
    function iterate(folder: Folder) {
      output.push('<ul>');
      for (const node of folder.children) {
        if (checkNodeAbandoned(node)) {
          continue;
        }
        if (node.type === 'folder') {
          output.push('<li>');
          output.push(escapeHTML(node.displayName));
          iterate(node);
          output.push('</li>');
        } else if (node.type === 'Markdown') {
          output.push(`<li><a href="chapters/${node.htmlRelativePath}">${escapeHTML(node.displayName)}</a></li>`);
        }
      }
      output.push('</ul>');
    }
    iterate(data.chapterTree);
    return output.join('');
  }

  const entryHTML = entryTemplate
    .replace(/<placeholder-chapter-tree\/>/g, buildChapterTreeHTML());

  function findPreviousChapter(folder: Folder, index: number) {
    for (let i = index - 1; i >= 0; i--) {
      const node = folder.children[i];
      if (node.type === 'Markdown' && !node.abandoned) {
        return node;
      }
    }
    return null;
  }

  function findNextChapter(folder: Folder, index: number) {
    for (let i = index + 1; i < folder.children.length; i++) {
      const node = folder.children[i];
      if (node.type === 'Markdown' && !node.abandoned) {
        return node;
      }
    }
    return null;
  }

  async function buildFolder(folder: Folder, depth: number, siteMap: Array<string>) {
    await ensureDir(join(distLiteDir, 'chapters', folder.htmlRelativePath));
    for (const [i, node] of folder.children.entries()) {
      if (node.type === 'folder') {
        await buildFolder(node, depth + 1, siteMap);
      } else if (node.type === 'Markdown') {
        const pathToLiteRoot = '../'.repeat(depth + 1);
        let html = chapterTemplate
          .replace(/<placeholder-title\/>/g, formatRelativePath(node.htmlRelativePath))
          .replace(
            /<placeholder-content\/>/g,
            await readFile(join(distDir, 'chapters', node.htmlRelativePath), 'utf8'),
          )
          .replace(
            /<placeholder-keywords\/>/g,
            [...new Set(node.tags?.map(tagVariant => `${tagVariant.split('（')[0]}`) ?? [])].join(', '),
          )
          .replace(/<placeholder-to-index\/>/g, pathToLiteRoot)
          .replace(/<placeholder-to-full-version\/>/g, pathToLiteRoot + '../#/chapter/' + node.htmlRelativePath)
          .replace(/<placeholder-html-relative-path\/>/g, node.htmlRelativePath);
        if (node.authors.length > 0) {
          html = html.replace(
            /<placeholder-authors\/>/g,
            node.authors
              .map(({ name, role }) => `${role}：${name}`)
              .join('，') + '。',
          );
        }
        const prevChapter = findPreviousChapter(folder, i);
        if (prevChapter !== null) {
          html = html.replace(
            /<placeholder-prev\/>/g,
            `<a href="${pathToLiteRoot}chapters/${prevChapter.htmlRelativePath}">上一章</a>`,
          );
        }
        const nextChapter = findNextChapter(folder, i);
        if (nextChapter !== null) {
          html = html.replace(
            /<placeholder-next\/>/g,
            `<a href="${pathToLiteRoot}chapters/${nextChapter.htmlRelativePath}">下一章</a>`,
          );
        }
        // 我知道不应该使用 regex 匹配 html。但是如果要“正确”地做的话，需要引入一个完整的 DOM 或者重新编译 markdown。
        // 这些实在太累了，所以还是算了偷个懒好了。
        html = html
          .replace(
            /<img src="chapters\/(.*?)"/g,
            `<img src="${pathToLiteRoot}../chapters/$1"`,
          )
          .replace(
            /<a href="#\/chapter\/(.*?)">/g,
            `<a href="${pathToLiteRoot}chapters/$1">`,
          )
          .replace(
            /<a href="(#\/.*?)">(.*?)<\/a>/g,
            `<a href="${pathToLiteRoot}..$1">【精简版不支持的功能，点击将离开精简版】$2</a>`,
          );
        await writeFile(join(distLiteDir, 'chapters', node.htmlRelativePath), html);
        siteMap.push('https://zw.lama.icu/lite/chapters/' + node.htmlRelativePath);
      }
    }
  }

  const siteMap = [
      'https://zw.lama.icu',
      'https://zw.lama.icu/lite/entry.html',
  ];

  await buildFolder(data.chapterTree, 0, siteMap);

  await writeFile(join(distLiteDir, 'entry.html'), entryHTML);

  await writeFile(join(distDir, 'siteMap.txt'), siteMap.join('\n'));
}


import { mkdirp, writeFile } from 'fs-extra';
import { dirname } from 'path';
import { AuthorRole, ChapterFlags, ChapterFlagsMapped, MarkdownChapter } from '../../Data';
import { fPath, log } from '../indentConsole';
import { LoaderContext } from '../LoaderContext';
import { Loader } from './Loader';
import { parseAuthorSpecifier } from './parseAuthorSpecifier';
import { parseTagSpecifier } from './parseTagSpecifier';


const markdownFlags = new Map<string, ChapterFlags>([
  ['# 编写中', 'isEarlyAccess'],
  ['# 隐藏', 'hidden'],
  ['# 已弃坑', 'abandoned'],
]);

function readMarkdownFlags(markdown: string): [string, ChapterFlagsMapped] {
  const flagsMapped: ChapterFlagsMapped = {};
  let changed;
  do {
    changed = false;
    markdown = markdown.trimLeft();
    for (const [keyword, flag] of markdownFlags) {
      if (markdown.startsWith(keyword)) {
        changed = true;
        flagsMapped[flag] = true;
        markdown = markdown.substr(keyword.length);
      }
    }
  } while (changed);
  return [markdown, flagsMapped];
}

function loadProperty(markdown: string, key: string) {
  markdown = markdown.trimLeft();
  if (markdown.startsWith('- ')) {
    markdown = markdown.substr(2).trimLeft();
  }
  if (!markdown.startsWith(`${key}：`)) {
    return { markdown, value: null };
  }
  const lineBreakIndex = markdown.indexOf('\n');
  const value = markdown.substring(key.length + 1, lineBreakIndex).trim();
  markdown = markdown.substr(lineBreakIndex).trimLeft();
  return { markdown, value };
}

export const markdownLoader: Loader = {
  name: 'Markdown Loader',
  async canLoad(ctx: LoaderContext) {
    return !ctx.isDirectory && ctx.path.endsWith('.md');
  },
  isInBuildFiles(ctx: LoaderContext, buildFiles: Array<string>) {
    return buildFiles.includes(ctx.path);
  },
  async load(ctx: LoaderContext): Promise<MarkdownChapter> {
    let markdown = (await ctx.readFile()).trimLeft();

    let authors: Array<AuthorRole> = [];
    let authorSpecifier: string | null;
    ({ markdown, value: authorSpecifier } = loadProperty(markdown, '作者'));
    if (authorSpecifier !== null) {
      authors = parseAuthorSpecifier(authorSpecifier);
    }

    let tags: Array<string> | undefined;
    let tagSpecifier: string | null;
    ({ markdown, value: tagSpecifier } = loadProperty(markdown, '标签'));
    if (tagSpecifier !== null) {
      tags = parseTagSpecifier(tagSpecifier, tag => ctx.isTagValid(tag));
    }

    let chapterFlagsMapped: ChapterFlagsMapped;
    [markdown, chapterFlagsMapped] = readMarkdownFlags(markdown);
    const chapterCharCount = ctx.stats.processMarkdown(markdown);

    const node = ctx.getNode();
    log(`[[green|Use display name [[yellow|${fPath(node.displayName)}]].]]`);
    ctx.setDistFileName(node.displayName + '.html');
    const mdi = ctx.createMDI();
    const output = mdi.render(markdown);

    const creationTime = await ctx.getCreationTime();

    ctx.stats.processHtml(output);

    const htmlPath = ctx.getDistFullPath();
    await mkdirp(dirname(htmlPath));
    await writeFile(htmlPath, output);
    log(`[[green|Rendered to [[yellow|${fPath(htmlPath)}]].]]`);

    return {
      ...node,
      ...chapterFlagsMapped,
      type: 'Markdown',
      creationTime,
      htmlRelativePath: ctx.getDistRelativePath(),
      authors,
      tags,
      charsCount: chapterCharCount,
    };
  }
};

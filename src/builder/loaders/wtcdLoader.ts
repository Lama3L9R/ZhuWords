import { mkdirp, pathExists, readFile, writeFile } from 'fs-extra';
import { dirname, parse as parsePath, resolve } from 'path';
import { Chapter } from '../../Data';
import { parse } from '../../wtcd/parse';
import { WTCDParseResult } from '../../wtcd/types';
import { dedent, fPath, indent, log } from '../indentConsole';
import { LoaderContext, LoaderError } from '../LoaderContext';
import { Loader } from './Loader';
import { parseAuthorSpecifier } from './parseAuthorSpecifier';
import { parseTagSpecifier } from './parseTagSpecifier';

export const wtcdLoader: Loader = {
  name: 'WTCD Loader',
  async canLoad(ctx: LoaderContext) {
    return !ctx.isDirectory && ctx.path.endsWith('.wtcd');
  },
  isInBuildFiles(ctx: LoaderContext, buildFiles: Array<string>) {
    return buildFiles.includes(ctx.path);
  },
  async load(ctx: LoaderContext): Promise<Chapter> {
    const parsedPath = parsePath(ctx.path);
    const metaPath = resolve(parsedPath.dir, parsedPath.name + '.meta.json');
    const meta: any = {
      isEarlyAccess: false,
      hidden: false,
      authors: [],
      preferredReader: 'flow',
    };
    if (await pathExists(metaPath)) {
      const content = JSON.parse(await readFile(metaPath, 'utf8'));
      if (typeof content.isEarlyAccess === 'boolean') {
        meta.isEarlyAccess = content.isEarlyAccess;
      }
      if (typeof content.hidden === 'boolean') {
        meta.hidden = content.hidden;
      }
      if (typeof content.preferredReader === 'string') {
        if (content.preferredReader === 'game') {
          if (typeof content.slideAnimation === 'boolean') {
            meta.slideAnimation = content.slideAnimation;
          } else {
            meta.slideAnimation = true;
          }
        } else if (content.preferredReader !== 'flow') {
          throw new Error(`Unknown reader type: ${content.preferredReader}.`);
        }
        meta.preferredReader = content.preferredReader;
      }
      if (typeof content.authors === 'string') {
        meta.authors = parseAuthorSpecifier(content.authors);
      }
      if (typeof content.tags === 'string') {
        meta.tags = parseTagSpecifier(content.tags, tag => ctx.isTagValid(tag));
      }
    }

    const source = await ctx.readFile();
    const node = ctx.getNode();
    log(`[[green|Use display name [[yellow|${fPath(node.displayName)}]].]]`);
    ctx.setDistFileName(node.displayName + '.html');
    const mdi = ctx.createMDI();

    const creationTime = await ctx.getCreationTime();

    const htmlPath = ctx.getDistFullPath();
    await mkdirp(dirname(htmlPath));

    let chapterCharCount: number | null = 0;

    log(`[[green|Start parsing WTCD for [[yellow|${fPath(ctx.path)}]].]]`);


    const logger = {
      info(msg: string): void {
        log(`[[green|${msg}]]`);
      },
      error(msg: string): void {
        log(`[[red|this.prefix ${msg}]]`);
      },
      warn(msg: string): void {
        log(`[[yellow|this.prefix ${msg}]]`);
      }
    };
    let wtcdParseResult: WTCDParseResult;
    indent();
    try {
      wtcdParseResult = parse({ source, mdi, logger, sourceMap: !ctx.argv.production, markdownPreProcessor: markdown => {
        const deltaChars = ctx.stats.processMarkdown(markdown);
        if (deltaChars !== null && chapterCharCount !== null) {
          chapterCharCount += deltaChars;
        } else {
          chapterCharCount = null;
        }
        return markdown;
      }, htmlPostProcessor: html => {
        ctx.stats.processHtml(html);
        return html;
      }});
    } finally {
      dedent();
    }
    if (wtcdParseResult.error) {
      log(`[[red|WTCD parsing has errored: [[cyan|${wtcdParseResult.message}]].]]`);
      ctx.pushError(new LoaderError(wtcdLoader.name, ctx.path, wtcdParseResult.internalStack));
    }
    await writeFile(htmlPath, JSON.stringify(wtcdParseResult));

    log(`[[green|Parsed result written to [[yellow|${fPath(htmlPath)}]].]]`);

    return {
      ...node,
      ...meta,
      type: 'WTCD',
      creationTime,
      htmlRelativePath: ctx.getDistRelativePath(),
      charsCount: chapterCharCount,
    };
  },
};

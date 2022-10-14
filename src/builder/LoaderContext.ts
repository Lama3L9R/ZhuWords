import { readFile, stat } from 'fs-extra';
import * as MDI from 'markdown-it';
import * as mdiReplaceLinkPlugin from 'markdown-it-replace-link';
import * as mdiRubyPlugin from 'markdown-it-ruby';
import { dirname, posix, resolve } from 'path';
import { Argv } from '.';
import { isCompressibleImage, isDocument, isResource } from '../fileExtensions';
import { TagSpec } from '../TagsSpec';
import { Node } from './../Data';
import { destructPath } from './destructPath';
import { distChaptersDir } from './dirs';
import { ErrorReporter, ReportableError } from './ErrorReporter';
import { getCreationTime } from './getCreationTime';
import { fPath, log } from './indentConsole';
import { Stats } from './Stats';

const { join } = posix;

export class LoaderError implements ReportableError {
  public constructor(
    private loaderName: string,
    private path: string,
    private error: any,
  ) {}
  public print(): void {
    log(`[[red|Error caused by loader [[cyan|${this.loaderName}]] on file [[yellow|${fPath(this.path)}]]:]]`);
    console.info(this.error);
  }
}

export class LoaderContext {
  public constructor(
    public readonly isDirectory: boolean,
    public readonly path: string,
    public readonly parentDistRelativePath: string,
    public readonly stats: Stats,
    public readonly argv: Argv,
    private readonly errorReporter: ErrorReporter,
    private readonly tagsMap: ReadonlyMap<string, TagSpec> | null,
    public readonly buildFiles: Array<string> | null,
    public readonly nodeCache: Map<string, Node>,
  ) {}

  private distRelativePath: string | null = null;

  public updateCache(node: Node) {
    this.nodeCache.set(this.path, node);
  }

  public removeCache() {
    this.nodeCache.delete(this.path);
  }

  public getLastSuccess() {
    return this.nodeCache.get(this.path) ?? null;
  }

  public setDistFileName(fileName: string) {
    this.distRelativePath = (this.parentDistRelativePath === '' ? fileName : join(this.parentDistRelativePath, fileName))
      .split(' ')
      .join('-');
  }

  public getNode() {
    return destructPath(this.path);
  }

  public getDistRelativePath() {
    if (this.distRelativePath === null) {
      throw new Error('A prior call to #setDistFileName() is required.');
    }
    return this.distRelativePath;
  }

  public getDistFullPath() {
    return resolve(distChaptersDir, this.getDistRelativePath());
  }

  public getLiteDistRelativePath() {
    return join('lite', this.getDistRelativePath());
  }

  public getLiteDistFullPath() {
    return resolve(distChaptersDir, this.getLiteDistRelativePath());
  }

  public getCreationTime() {
    if (this.argv.production) {
      return getCreationTime(this.path);
    } else {
      return 0;
    }
  }

  public readFile(): Promise<string> {
    return readFile(this.path, 'utf8');
  }

  public createMDI() {
    const htmlRelativePath = this.getDistRelativePath();
    return new MDI({
      replaceLink(link: string) {
        if (!link.startsWith('./')) {
          return link;
        }
        if (isResource(link) || isCompressibleImage(link)) {
          return join('./chapters', dirname(htmlRelativePath), link);
        }
        if (isDocument(link)) {
          return '#/chapter/' + join(dirname(htmlRelativePath), link);
        }
      },
    } as MDI.Options)
      .use(mdiReplaceLinkPlugin)
      .use(mdiRubyPlugin);
  }

  public shouldBuildLite() {
    return this.argv.production || this.argv.buildLite;
  }

  public async derive(subPath: string) {
    return new LoaderContext(
      (await stat(subPath)).isDirectory(),
      subPath,
      this.getDistRelativePath(),
      this.stats,
      this.argv,
      this.errorReporter,
      this.tagsMap,
      this.buildFiles,
      this.nodeCache,
    );
  }

  public pushError(error: LoaderError) {
    this.errorReporter.reportError(error);
  }

  public isTagValid(tag: string) {
    const match = tag.match(/^(.+?)(?:（(.+)）)?$/);
    if (match === null) {
      return false;
    }
    if (this.tagsMap === null) {
      return true;
    }
    const tagSpec = this.tagsMap.get(match[1]);
    if (tagSpec === undefined) {
      return false;
    }
    if (match[2] === undefined) {
      return tagSpec.variants === null;
    } else {
      return tagSpec.variants !== null && tagSpec.variants.includes(match[2]);
    }
  }
}

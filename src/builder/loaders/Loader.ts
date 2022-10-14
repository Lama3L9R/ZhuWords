import { Node } from '../../Data';
import { dedent, indent, log, fPath } from '../indentConsole';
import { LoaderContext, LoaderError } from '../LoaderContext';
import { folderLoader } from './folderLoader';
import { imageLoader } from './imageLoader';
import { markdownLoader } from './markdownLoader';
import { resourceLoader } from './resourceLoader';
import { wtcdLoader } from './wtcdLoader';

export interface Loader {
  name: string;
  canLoad(ctx: LoaderContext): Promise<boolean>;
  isInBuildFiles(ctx: LoaderContext, buildFiles: Array<string>): boolean;
  load(ctx: LoaderContext): Promise<Node | null>;
}

const loaders: Array<Loader> = [
  folderLoader,
  markdownLoader,
  wtcdLoader,
  resourceLoader,
  imageLoader,
];

export async function load(ctx: LoaderContext) {
  for (const loader of loaders) {
    if (await loader.canLoad(ctx)) {
      if (ctx.buildFiles !== null && !loader.isInBuildFiles(ctx, ctx.buildFiles)) {
        return ctx.getLastSuccess();
      }
      log(`[[green|Load [[yellow|${fPath(ctx.path)}]] with [[cyan|${loader.name}]].]]`);
      let result;
      indent();
      try {
        result = await loader.load(ctx);
      } catch (error) {
        ctx.pushError(new LoaderError(loader.name, ctx.path, error));
        result = null;
      } finally {
        dedent();
      }
      if (result === null) {
        ctx.removeCache();
      } else {
        ctx.updateCache(result);
      }
      return result;
    }
  }
  return null;
}

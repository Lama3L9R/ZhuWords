import { copyFile, mkdirp } from 'fs-extra';
import { basename, dirname, resolve } from 'path';
import { distChaptersDir } from '../dirs';
import { isCompressibleImage } from '../../fileExtensions';
import { fPath, log } from '../indentConsole';
import { LoaderContext } from '../LoaderContext';
import { Loader } from './Loader';
import sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(1);

const LOW_RESOLUTION_WIDTH = 720;

export const imageLoader: Loader = {
  name: 'Image Loader',
  async canLoad(ctx: LoaderContext) {
    return !ctx.isDirectory && isCompressibleImage(ctx.path);
  },
  isInBuildFiles(ctx: LoaderContext, buildFiles: Array<string>) {
    return buildFiles.includes(ctx.path);
  },
  async load(ctx: LoaderContext): Promise<null> {
    ctx.setDistFileName(basename(ctx.path));
    const targetRelativePath = ctx.getDistRelativePath();
    const targetPath = resolve(distChaptersDir, targetRelativePath);
    await mkdirp(dirname(targetPath));

    const fullResolutionPath = targetPath.replace(/\.([^.]+)$/, '.full.$1');
    await copyFile(ctx.path, fullResolutionPath);
    log(`[[green|Copied to [[yellow|${fPath(fullResolutionPath)}]].]]`);

    if ((await sharp(ctx.path).metadata()).width! <= LOW_RESOLUTION_WIDTH) {
      await copyFile(ctx.path, targetPath);
      log(`[[green|Copied to [[yellow|${fPath(targetPath)}]].]]`);
    } else {
      await sharp(ctx.path).resize(LOW_RESOLUTION_WIDTH).toFile(targetPath);
      log(`[[green|Resized to [[yellow|${fPath(targetPath)}]].]]`);
    }

    return null;
  },
};

import { readdir, readFile } from 'fs-extra';
import { resolve } from 'path';
import { FolderMeta, Node } from '../../Data';
import { LoaderContext } from '../LoaderContext';
import { load, Loader } from './Loader';

function byDisplayIndex(a: Node, b: Node) {
  const largestCommonIndex = Math.min(a.displayIndex.length, b.displayIndex.length);
  for (let i = 0; i < largestCommonIndex; i++) {
    const diff = a.displayIndex[i] - b.displayIndex[i];
    if (diff !== 0) {
      return diff;
    }
  }
  return a.displayIndex.length - b.displayIndex.length;
}

export const folderLoader: Loader = {
  name: 'Folder Loader',
  async canLoad(ctx: LoaderContext) {
    return ctx.isDirectory;
  },
  isInBuildFiles(ctx: LoaderContext, buildFiles: Array<string>) {
    return buildFiles.some(path => path.startsWith(ctx.path));
  },
  async load(ctx: LoaderContext): Promise<Node | null> {
    const node = ctx.getNode();
    ctx.setDistFileName(node.displayName);
    const names = await readdir(ctx.path);
    const children: Array<Node> = [];
    let meta: FolderMeta = {};
    for (const name of names) {
      if (name === 'meta.json') {
        meta = JSON.parse(await readFile(resolve(ctx.path, name), 'utf8'));
      } else {
        const child = await load(await ctx.derive(resolve(ctx.path, name)));
        if (child !== null) {
          children.push(child);
        }
      }
    }
    children.sort(byDisplayIndex);
    let charsCount: number | null = 0;
    for (const child of children) {
      if (child.charsCount === null) {
        charsCount = null;
        break;
      }
      charsCount += child.charsCount;
    }
    return {
      ...meta,
      ...node,
      type: 'folder',
      htmlRelativePath: ctx.getDistRelativePath(),
      children,
      charsCount,
    };
  },
};

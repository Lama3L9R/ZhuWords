import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { copy, ensureDir, readFile, writeFile } from 'fs-extra';
import { stringify } from 'javascript-stringify';
import { join, resolve } from 'path';
import { Data, Folder, Node } from '../Data';
import { TagSpec, TagsSpec } from '../TagsSpec';
import { chaptersDir, distChaptersDir, distDir, rootDir, staticDir, tagsSpec } from './dirs';
import { ErrorReporter } from './ErrorReporter';
import { log } from './indentConsole';
import { LoaderContext } from './LoaderContext';
import { load } from './loaders/Loader';
import { Stats } from './Stats';
import { loadTagsSpec, validateAndBuildTagMap } from './tagsSpecParser';
import {execAsyncWithRetry} from './execAsyncWithRetry';
import chokidar = require('chokidar');
import yargs = require('yargs');
import { buildLite } from './buildLite';

const argv = yargs.options({
  production: { type: 'boolean', default: false },
  buildLite: { type: 'boolean', default: false, alias: 'build-lite' },
  suppressError: { type: 'boolean', default: false, alias: 'suppress-error' },
  watch: { type: 'boolean', default: false, alias: 'w' },
}).argv;

export type Argv = typeof argv;

if (!argv.watch) {
  build(null).catch(error => console.error(error));
} else {
  if (argv.buildLite) {
    console.error('Build lite is only supported without watch mode.');
    process.exit(1);
  }
  const watcher = chokidar.watch([chaptersDir, tagsSpec], {
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 60,
    },
  });
  let building = false;
  const buildFiles = new Set<string>();
  const scheduleBuild = (path: string) => {
    buildFiles.add(path);
    if (building) {
      return;
    }
    building = true;
    (async () => {
      while (buildFiles.size > 0) {
        const toBeBuilt = [...buildFiles];
        buildFiles.clear();
        log(`[[green|Building [[yellow|${toBeBuilt.length}]] changed files...]]`);
        await build(toBeBuilt);
      }
      building = false;
    })().catch(error => console.error(error));
  };
  watcher.on('add', scheduleBuild);
  watcher.on('change', scheduleBuild);
  watcher.on('unlink', scheduleBuild);
}

const nodeCache = new Map<string, Node>();

async function readBuildNumber() {
  try {
    return (await execAsyncWithRetry(`git rev-list --count HEAD`)).stdout;
  } catch (error: any) {
    log(error);
    return 'Unknown';
  }
}

async function build(buildFiles: Array<string> | null) {
  const errorReporter = new ErrorReporter();
  const startTime = Date.now();

  await ensureDir(distChaptersDir);

  // Load tags spec
  let tagsSpec: null | TagsSpec = null;
  let tagsMap: null | ReadonlyMap<string, TagSpec> = null;
  let tagAliasMap: null | ReadonlyMap<string, string> = null;
  try {
    tagsSpec = await loadTagsSpec();
    ({ tagAliasMap, tagsMap } = await validateAndBuildTagMap(tagsSpec));
  } catch (error) {
    errorReporter.wrapAndReportError('Failed to load tags spec.', error as Error);
  }

  if (tagsSpec !== null) {
    await writeFile(
      resolve(distDir, 'tagsSpec.json'),
      JSON.stringify(tagsSpec, null, argv.production ? 0 : 2),
    );
  }

  const stats = new Stats(argv.production);

  const rootLoaderCtx = new LoaderContext(
    true,
    chaptersDir,
    '',
    stats,
    argv,
    errorReporter,
    tagsMap,
    buildFiles,
    nodeCache,
  );

  const data: Data = {
    chapterTree: await load(rootLoaderCtx)! as Folder,
    charsCount: argv.production ? stats.getCharsCount() : null,
    paragraphsCount: stats.getParagraphCount(),
    keywordsCount: [...stats.getKeywordsCount()].sort((a, b) => b[1] - a[1]),
    buildNumber: await readBuildNumber(),
    authorsInfo: JSON.parse(await readFile(join(rootDir, 'authors.json'), 'utf8')),
    buildError: errorReporter.hasError(),
    tags: tagsSpec === null ? [] : tagsSpec
      .sort((a, b) => b.priority - a.priority)
      .map(tagSpec => [
        tagSpec.tag,
        tagSpec.variants,
      ]),
    tagAliases: Array.from(tagAliasMap ?? []),
  };
  await writeFile(
    resolve(distDir, 'data.js'),
    `window.DATA=${stringify(data, null, argv.production ? 0 : 2, { skipUndefinedProperties: true })};`,
  );
  log('[[green|data.js created.]]');

  // Copy static
  await copy(staticDir, distDir);
  const indexPath = resolve(distDir, 'index.html');
  let result = await readFile(indexPath, 'utf8');
  const hash = (path: string) => createHash('sha256')
    .update(readFileSync(resolve(distDir, path)))
    .digest('hex')
    .substr(0, 12);
  result = result.replace(/<script src="(.*?)" defer><\/script>/g, (_, path) => {
    return `<script src="${path}?hash=${hash(path)}" defer></script>`;
  });
  result = result.replace(/<link rel="stylesheet" type="text\/css" href="(.*?)">/g, (_, path) => {
    return `<link rel="stylesheet" type="text/css" href="${path}?hash=${hash(path)}">`;
  });
  await writeFile(indexPath, result, 'utf8');

  log('[[green|Static copied.]]');
  if (argv.production || argv.buildLite) {
    await buildLite(data);
    log('[[green|Lite build done.]]');
  }

  log(`[[green|Time spent: [[cyan|${Date.now() - startTime}ms]].]]`);

  if (errorReporter.hasError()) {
    log();
    errorReporter.printAll();
    if (!argv.watch && !argv.suppressError) {
      process.exit(1);
    }
  }
}

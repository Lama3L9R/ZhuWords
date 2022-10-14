import { Chapter, Data, Folder, AuthorInfo } from '../../Data';
import { DebugLogger } from '../DebugLogger';
export const data = (window as any).DATA as Data;

export interface ChapterContext {
  folder: Folder;
  inFolderIndex: number;
  chapter: Chapter;
}

const debugLogger = new DebugLogger('Data');

export const tagCountMap: Map<string, number> = new Map();
function incrementCount(tag: string) {
  tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
}
export const relativePathLookUpMap: Map<string, ChapterContext> = new Map();
function iterateFolder(folder: Folder) {
  folder.children.forEach((child, index) => {
    if (child.type === 'folder') {
      iterateFolder(child);
    } else {
      relativePathLookUpMap.set(child.htmlRelativePath, {
        folder,
        chapter: child,
        inFolderIndex: index,
      });
      child.tags?.forEach(tag => {
        incrementCount(tag);
        if (tag.includes('（')) {
          incrementCount(tag.substr(0, tag.indexOf('（')));
        }
      });
    }
  });
}
const startTime = Date.now();
iterateFolder(data.chapterTree);
debugLogger.log(`Iterating folders took ${Date.now() - startTime}ms.`);

export const authorInfoMap: Map<string, AuthorInfo> = new Map();
for (const authorInfo of data.authorsInfo) {
  authorInfoMap.set(authorInfo.name, authorInfo);
}

export const tagAliasMap = new Map(data.tagAliases);

import { relativePathLookUpMap } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { getHistory } from '../data/readingProgress';
import { Menu } from '../Menu';
import { getDecorationForChapterType } from './ChaptersMenu';

export class HistoryChaptersMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    // This is very fast. There is no need to display any loading text.
    getHistory().then(entries => {
      let hasAny = false;
      entries.forEach(({ relativePath, progress }) => {
        const chapterCtx = relativePathLookUpMap.get(relativePath);
        if (chapterCtx === undefined) {
          return;
        }
        hasAny = true;
        const handle = this.addItem(chapterCtx.folder.displayName + ' > ' + chapterCtx.chapter.displayName, {
          button: true,
          decoration: getDecorationForChapterType(chapterCtx.chapter.type),
          link: chapterHref(chapterCtx.chapter.htmlRelativePath),
        });
        handle.prepend(`[${progress === 1 ? '完成' : `${Math.round(progress * 100)}%` }]`);
      });
      if (!hasAny) {
        this.addItem('阅读历史为空');
      }
    }, () => {
      this.addItem('记录阅读历史需要浏览器支持 IndexedDB。您的浏览器不支持 IndexedDB。请更新浏览器后再试。');
    });
  }
}

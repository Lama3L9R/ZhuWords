import { relativePathLookUpMap } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { ItemDecoration, Menu } from '../Menu';
import { formatTimeRelativeLong } from '../util/formatTime';
import { getDecorationForChapterType } from './ChaptersMenu';

export class LatestChaptersMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    let chapterCtxs = Array.from(relativePathLookUpMap.values());
    chapterCtxs = chapterCtxs.filter(chapterCtx => !chapterCtx.chapter.htmlRelativePath.includes('META'));
    chapterCtxs.sort((a, b) => b.chapter.creationTime - a.chapter.creationTime);
    chapterCtxs = chapterCtxs.slice(0, 20);
    chapterCtxs.forEach(chapterCtx => {
      const handle = this.addItem(chapterCtx.folder.displayName + ' > ' + chapterCtx.chapter.displayName, {
        button: true,
        decoration: getDecorationForChapterType(chapterCtx.chapter.type),
        link: chapterHref(chapterCtx.chapter.htmlRelativePath),
      });
      handle.prepend(`[${formatTimeRelativeLong(new Date(chapterCtx.chapter.creationTime * 1000))}]`);
    });
    this.addItem('查看所有章节', {
      button: true,
      decoration: ItemDecoration.ICON_LIST,
      link: '#/menu/章节选择/所有章节',
    });
  }
}

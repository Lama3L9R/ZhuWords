import { Folder } from '../../Data';
import { canChapterShown } from '../control/chapterControl';
import { data } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { charCount, earlyAccess, showAbandonedChapters } from '../data/settings';
import { ItemDecoration, Menu } from '../Menu';
import { shortNumber } from '../util/shortNumber';
import { getDecorationForChapterType } from './ChaptersMenu';

export function isEmptyFolder(folder: Folder): boolean {
  return folder.children.every(child =>
    (child.type === 'folder')
      ? isEmptyFolder(child)
      : !canChapterShown(child));
}

export function isAbandonedFolder(folder: Folder): boolean {
  return folder.children.every(child =>
    (child.type === 'folder')
      ? isAbandonedFolder(child)
      : child.abandoned);
}

export class ChapterListingMenu extends Menu {
  public constructor(urlBase: string, folder?: Folder) {
    super(urlBase);
    if (folder === undefined) {
      folder = data.chapterTree;
    }
    for (const child of folder.children) {
      if (child.type === 'folder') {
        const handle = this.buildSubMenu(child.displayName, ChapterListingMenu, child)
          .setUrlSegment(child.displayName.replace(/ /g, '-'))
          .setDecoration(ItemDecoration.ICON_FOLDER)
          .setHidden(isEmptyFolder(child))
          .build();
        if (isAbandonedFolder(child)) {
          handle.prepend('[已弃坑]');
        }
        if (child.charsCount !== null && charCount.getValue()) {
          handle.append(`[${shortNumber(child.charsCount)}]`);
        }
      } else {
        if (child.hidden) {
          continue;
        }
        if (child.abandoned && !showAbandonedChapters.getValue()) {
          continue;
        }
        if (child.isEarlyAccess && !earlyAccess.getValue()) {
          continue;
        }
        const handle = this.addItem(child.displayName, {
          button: true,
          link: chapterHref(child.htmlRelativePath),
          decoration: getDecorationForChapterType(child.type),
        });
        if (child.abandoned) {
          handle.prepend('[已弃坑]');
        }
        if (folder.showIndex === true) {
          handle.prepend(`${child.displayIndex.join('.')}. `);
        }
        if (child.isEarlyAccess) {
          handle.prepend('[编写中]');
        }
        if (child.charsCount !== null && charCount.getValue()) {
          handle.append(`[${shortNumber(child.charsCount)}]`);
        }
      }
    }
  }
}

import { NodeType } from '../../Data';
import { pageHref } from '../data/hrefs';
import { ItemDecoration, Menu } from '../Menu';
import { AuthorsMenu } from './AuthorsMenu';
import { ChapterListingMenu } from './ChapterListingMenu';
import { HistoryChaptersMenu } from './HistoryChaptersMenu';
import { LatestChaptersMenu } from './LatestChapterMenu';

export function getDecorationForChapterType(chapterType: NodeType) {
  switch (chapterType) {
    case 'Markdown': return ItemDecoration.ICON_FILE;
    case 'WTCD': return ItemDecoration.ICON_GAME;
  }
}

export class ChaptersMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    this.buildSubMenu('所有章节', ChapterListingMenu)
      .setDecoration(ItemDecoration.ICON_LIST).build();
    this.buildSubMenu('最新更新', LatestChaptersMenu)
      .setDecoration(ItemDecoration.ICON_CALENDER).build();
    this.buildSubMenu('阅读历史', HistoryChaptersMenu)
      .setDecoration(ItemDecoration.ICON_HISTORY).build();
    this.addItem('按标签检索', {
      button: true,
      link: pageHref('tag-search'),
      decoration: ItemDecoration.ICON_TAG,
    });
    this.buildSubMenu('按作者检索', AuthorsMenu)
      .setDecoration(ItemDecoration.ICON_PERSON).build();
  }
}

import { data } from '../data/data';
import { pageHref } from '../data/hrefs';
import { ItemDecoration, Menu } from '../Menu';
import { shortNumber } from '../util/shortNumber';
import { StatsKeywordsCountMenu } from './StatsKeywordsCountMenu';

export class StatsMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    this.addItem('访问量统计', { button: true, link: pageHref('visit-count'), decoration: ItemDecoration.ICON_EQUALIZER });
    this.buildSubMenu('关键词统计', StatsKeywordsCountMenu)
      .setDecoration(ItemDecoration.ICON_EQUALIZER)
      .build();
    this.addItem(`总字数：${data.charsCount === null ? '不可用' : shortNumber(data.charsCount, 2)}`);
    this.addItem(`总段落数：${shortNumber(data.paragraphsCount, 2)}`);
  }
}

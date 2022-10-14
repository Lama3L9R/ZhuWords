import { pageHref } from '../data/hrefs';
import {ItemDecoration, Menu } from '../Menu';
import { ChaptersMenu } from './ChaptersMenu';
import { ContactMenu } from './ContactMenu';
import { LinkExchangeMenu } from './LinkExchangeMenu';
import { SettingsMenu } from './SettingsMenu';
import { StatsMenu } from './StatsMenu';
import { StyleMenu } from './StyleMenu';
// import { ThanksMenu } from './ThanksMenu';

export class MainMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    this.container.classList.add('main');
    this.buildSubMenu('章节选择', ChaptersMenu).build();
    // this.buildSubMenu('鸣谢列表', ThanksMenu).build();
    this.buildSubMenu('阅读器样式', StyleMenu).build();
    this.buildSubMenu('关于我们', ContactMenu).setUrlSegment('订阅及讨论组').build();
    this.addItem('最新评论', { button: true, link: pageHref('recent-comments') });
    this.buildSubMenu('友情链接', LinkExchangeMenu).build();
    this.buildSubMenu('设置', SettingsMenu).build();
    this.buildSubMenu('统计', StatsMenu).build();
    this.addItem('退出', {
        button: true,
        link: 'about:blank',
    })
  }
}

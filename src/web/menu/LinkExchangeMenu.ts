const links: Array<{
  text: string,
  link: string,
}> = [
  { text: '[网站原作者] 可穿戴科技', link: 'http://wt.tepis.me' },
];

import { ItemDecoration, Menu } from '../Menu';
export class LinkExchangeMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    links.sort(() => Math.random() - 0.5);
    links.forEach(({ text, link }) => this.addItem(text, {
      button: true,
      link,
      decoration: ItemDecoration.ICON_LINK,
    }));
  }
}

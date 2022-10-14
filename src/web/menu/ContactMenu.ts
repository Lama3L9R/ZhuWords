import { ItemDecoration, Menu } from '../Menu';

export class ContactMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    this.addItem('源代码', {
        button: true,
        link: 'https://TODO.REPLACE.GITURL',
        decoration: ItemDecoration.ICON_LINK,
    });
    this.addItem('原作源代码', {
      button: true,
      link: 'https://gitgud.io/RinTepis/wearable-technology',
      decoration: ItemDecoration.ICON_LINK,
    });
  }
}

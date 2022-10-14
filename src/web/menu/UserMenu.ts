import { showLoginModal, showUpdateProfileModal } from '../control/userControl';
import { Menu } from '../Menu';

export class UserMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    this.addItem('身份令牌', { button: true }).onClick(() => {
      showLoginModal();
    });
    this.addItem('修改身份信息', { button: true }).onClick(() => {
      showUpdateProfileModal();
    });
  }
}

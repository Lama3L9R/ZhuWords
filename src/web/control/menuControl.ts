// Provide menu coordination

import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { escapeKeyPressEvent } from '../input/keyboard';
import { Menu } from '../Menu';
import { MainMenu } from '../menu/MainMenu';
import { forceReflow, id } from '../util/DOM';
import { onPathHandled, PathHandler } from './followQuery';

export const mainMenu = new MainMenu('#/menu');
mainMenu.show();

const $path = id('menu-control-path');
const $back = id<HTMLAnchorElement>('menu-control-back');
const $control = id('menu-control');
const $titleContainer = id('title-container');

const debugLogger = new DebugLogger('Menu Control');

interface MenuStackItem {
  menu: Menu;
  urlSegment: string;
  pathSpan: HTMLSpanElement;
}

// Root behaves extremely different from other menus, therefore we will not
// include it in the stack.
const menuStack: Array<MenuStackItem> = [];

function getMenu(index: number) {
  if (index === -1) {
    return mainMenu;
  } else {
    return menuStack[index].menu;
  }
}

function getCurrentMenu() {
  return getMenu(menuStack.length - 1);
}

let isMenuMode = true;

/**
 * Used by "enterMenuMode" or regular handling of menu urls.
 */
function enteredMenuMode() {
  isMenuMode = true;
  document.title = '朱语';
  $titleContainer.classList.remove('hidden');
}

export function enterMenuMode() {
  debugLogger.log('Enter menu mode');
  if (menuStack.length === 0) {
    window.location.hash = '#';
  } else {
    window.location.hash = '#/menu/' + menuStack.map(({ urlSegment }) => urlSegment).join('/');
  }
  enteredMenuMode();
}

export function exitMenuMode() {
  isMenuMode = false;
  debugLogger.log('Exit menu mode');
  getCurrentMenu().hide();
  $control.classList.add('hidden');
  $titleContainer.classList.add('hidden');
}

function pop() {
  const { menu, pathSpan: $pathSpan } = menuStack.pop()!;
  menu.destroy();
  const startX = $pathSpan.offsetLeft;
  $pathSpan.classList.add('exiting');
  if (menuStack.length !== 0) {
    // Only play the moving animation when it is not the first element
    $pathSpan.style.left = `${startX}px`;
    forceReflow($pathSpan);
    $pathSpan.style.left = `${startX + 10}px`;
  } else {
    $pathSpan.classList.add('first');
  }
  setTimeout(() => $pathSpan.remove(), 500);
}

function popUntil(targetLength: number) {
  if (menuStack.length > targetLength) {
    debugLogger.log('Pop until', targetLength);
  }
  while (menuStack.length > targetLength) {
    pop();
  }
  menuStack.length = targetLength;
}

function updateShowingMenuControl() {
  $control.classList.toggle('hidden', menuStack.length === 0);
}

export function handleMainMenu() {
  debugLogger.log('Handle main menu');
  enteredMenuMode();
  popUntil(0);
  mainMenu.show();
  updateShowingMenuControl();
}

export const menuPathHandler: PathHandler = path => {
  debugLogger.log(`Handle path=${path}`);
  enteredMenuMode();
  const urlSegments = path.split('/');
  // Step 0: Hide current menu
  getCurrentMenu().hide();

  // Step 1: Forward iterate until point of diversion
  let index = 0;
  while (index < menuStack.length && index < urlSegments.length && menuStack[index].urlSegment === urlSegments[index]) {
    index++;
  }

  // Step 2: Discard additional menus from menu stack
  popUntil(index);

  // Step 3: Add additional menus
  for (; index < urlSegments.length; index++) {
    const urlSegment = urlSegments[index];
    const parentMenu = getMenu(index - 1);
    if (!parentMenu.subMenus.has(urlSegment)) {
      return false;
    }
    const { factory, name } = parentMenu.subMenus.get(urlSegment)!;
    const subMenu = factory();
    const $pathSpan = h('span', [
      h('span', '>'),
      h('a.button', {
        href: subMenu.urlBase,
      }, name),
    ]) as HTMLSpanElement;
    if (index !== 0) {
      $pathSpan.classList.add('pre-entering');
      $path.append($pathSpan);
      forceReflow($pathSpan);
      $pathSpan.classList.remove('pre-entering');
    } else {
      $path.append($pathSpan);
    }
    menuStack.push({
      menu: subMenu,
      pathSpan: $pathSpan,
      urlSegment,
    });
  }

  // Step 4: Show new menu
  getCurrentMenu().show();

  // Step 5: Show/hide menu control
  updateShowingMenuControl();

  // Step 6: Update back URL
  if (menuStack.length > 1) {
    // There are something other than main menu
    $back.href = menuStack[menuStack.length - 2].menu.urlBase;
  } else {
    $back.href = '#';
  }

  return true;
};

escapeKeyPressEvent.on(() => {
  if (!isMenuMode) {
    return;
  }
  if (menuStack.length > 1) {
    window.location.hash = menuStack[menuStack.length - 2].menu.urlBase;
  } else if (menuStack.length === 1) {
    window.location.hash = '';
  }
});

onPathHandled.on(({ handlerId }) => {
  if (handlerId !== 'menu') {
    exitMenuMode();
  }
});

const $logo = id('navbar-logo').cloneNode(true) as SVGElement;
$logo.id = 'path-logo';
$path.prepend(h('a', {
  href: '#',
}, $logo));

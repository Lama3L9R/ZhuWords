import { DebugLogger } from '../DebugLogger';
import { Event } from '../Event';

export enum Layout {
  SIDE,
  MAIN,
  OFF,
}

const $body = document.body;

const debugLogger = new DebugLogger('Layout');

export const layoutChangeEvent = new Event<{
  previousLayout: Layout,
  newLayout: Layout,
}>();

layoutChangeEvent.on(({ newLayout }) => {
  $body.classList.remove('layout-side', 'layout-main', 'layout-off');
  switch (newLayout) {
    case Layout.SIDE:
      $body.classList.add('layout-side');
      break;
    case Layout.MAIN:
      $body.classList.add('layout-main');
      break;
    case Layout.OFF:
      $body.classList.add('layout-off');
      break;
  }
});

let layout: Layout = Layout.OFF;
export function getCurrentLayout() {
  return layout;
}
export function setLayout(newLayout: Layout) {
  if (newLayout !== layout) {
    debugLogger.log(`${Layout[layout]} -> ${Layout[newLayout]}`);
  }

  if (layout === newLayout) {
    return;
  }

  // if (newLayout === Layout.OFF) {
  //   $rect.classList.remove('reading');
  // } else {
  //   if (layout === Layout.MAIN) {
  //     $rect.classList.remove('main');
  //   } else if (layout === Layout.SIDE) {
  //     $rect.classList.remove('side');
  //   } else {
  //     $rect.classList.remove('main', 'side');
  //     $rect.classList.add('reading');
  //   }
  //   if (newLayout === Layout.MAIN) {
  //     $rect.classList.add('main');
  //   } else {
  //     $rect.classList.add('side');
  //   }
  // }
  layoutChangeEvent.emit({
    previousLayout: layout,
    newLayout,
  });
  layout = newLayout;
}

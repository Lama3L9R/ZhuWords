import { DebugLogger } from '../DebugLogger';
import { Event } from '../Event';

export enum ArrowKey {
  LEFT,
  UP,
  RIGHT,
  DOWN,
}

export const arrowKeyPressEvent = new Event<ArrowKey>();
export const escapeKeyPressEvent = new Event();
document.addEventListener('keydown', event => {
  if (event.repeat) {
    return;
  }
  switch (event.keyCode) {
    case 27:
      escapeKeyPressEvent.emit();
      break;
    case 37:
      arrowKeyPressEvent.emit(ArrowKey.LEFT);
      break;
    case 38:
      arrowKeyPressEvent.emit(ArrowKey.UP);
      break;
    case 39:
      arrowKeyPressEvent.emit(ArrowKey.RIGHT);
      break;
    case 40:
      arrowKeyPressEvent.emit(ArrowKey.DOWN);
      break;
  }
});

const arrowEventDebugLogger = new DebugLogger('Arrow Key Event');
arrowKeyPressEvent.on(arrowKey => {
  arrowEventDebugLogger.log(ArrowKey[arrowKey]);
});

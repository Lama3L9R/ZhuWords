import { DebugLogger } from '../DebugLogger';
import { Event } from '../Event';
import { isAnyParent } from '../util/DOM';

export enum SwipeDirection {
  TO_TOP,
  TO_RIGHT,
  TO_BOTTOM,
  TO_LEFT,
}

const gestureMinWidth = 900;

export const swipeEvent: Event<SwipeDirection> = new Event();
const horizontalMinXProportion = 0.17;
const horizontalMaxYProportion = 0.1;
const verticalMinYProportion = 0.1;
const verticalMaxProportion = 0.1;
const swipeTimeThreshold = 500;
let startX = 0;
let startY = 0;
let startTime = 0;
let startTarget: EventTarget | null = null;
window.addEventListener('touchstart', event => {
  // Only listen for first touch starts
  if (event.touches.length !== 1) {
    return;
  }
  startTarget = event.target;
  startX = event.touches[0].clientX;
  startY = event.touches[0].clientY;
  startTime = Date.now();
});
window.addEventListener('touchend', event => {
  // Only listen for last touch ends
  if (event.touches.length !== 0) {
    return;
  }
  // Ignore touches that lasted too long
  if (Date.now() - startTime > swipeTimeThreshold) {
    return;
  }
  if (window.innerWidth > gestureMinWidth) {
    return;
  }
  const deltaX = event.changedTouches[0].clientX - startX;
  const deltaY = event.changedTouches[0].clientY - startY;
  const xProportion = Math.abs(deltaX / window.innerWidth);
  const yProportion = Math.abs(deltaY / window.innerHeight);
  if (xProportion > horizontalMinXProportion && yProportion < horizontalMaxYProportion) {
    // Horizontal swipe detected
    // Check for scrollable element
    if (isAnyParent(startTarget as HTMLElement, $element => (
      (window.getComputedStyle($element).getPropertyValue('overflow-x') !== 'hidden') &&
      ($element.scrollWidth > $element.clientWidth)
    ))) {
      return;
    }
    if (deltaX > 0) {
      swipeEvent.emit(SwipeDirection.TO_RIGHT);
    } else {
      swipeEvent.emit(SwipeDirection.TO_LEFT);
    }
  } else if (yProportion > verticalMinYProportion && xProportion < verticalMaxProportion) {
    // Vertical swipe detected
    // Check for scrollable element
    if (isAnyParent(startTarget as HTMLElement, $element => (
      (window.getComputedStyle($element).getPropertyValue('overflow-y') !== 'hidden') &&
      ($element.scrollHeight > $element.clientHeight)
    ))) {
      return;
    }
    if (deltaY > 0) {
      swipeEvent.emit(SwipeDirection.TO_BOTTOM);
    } else {
      swipeEvent.emit(SwipeDirection.TO_TOP);
    }
  }
});
const swipeEventDebugLogger = new DebugLogger('Swipe Event');
swipeEvent.on(direction => {
  swipeEventDebugLogger.log(SwipeDirection[direction]);
});

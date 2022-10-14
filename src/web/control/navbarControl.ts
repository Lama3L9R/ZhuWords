import { animation } from '../data/settings';
import { h } from '../hs';
import { forceReflow, id } from '../util/DOM';
import { contentChangeEvent, contentScrollEvent } from './contentControl';
import { Layout, layoutChangeEvent } from './layoutControl';
import { enterMenuMode } from './menuControl';

const $navbar = id('navbar');
const $navbarPathContainer = id('navbar-path-container');
const $progressIndicator = id('navbar-progress-indicator');
const $logo = id('navbar-logo');
const $title = id('navbar-title');

/**
 * Used for skipping the animation when transitioning from main layout.
 */
let delayedLayout: Layout;

export function setProgressIndicator(progress: number) {
  $progressIndicator.style.transform = `scaleX(${progress})`;
  $progressIndicator.classList.toggle('hidden', progress === 1 || progress === 0);
}

export function resetProgressIndicator() {
  setProgressIndicator(0);
}

layoutChangeEvent.on(({ newLayout }) => {
  resetProgressIndicator();
  setTimeout(() => delayedLayout = newLayout, 100);
});

$logo.addEventListener('click', () => {
  enterMenuMode();
});

$title.addEventListener('click', event => {
  event.preventDefault();
  enterMenuMode();
});

contentScrollEvent.on(({ scrollTop }) => $navbar.classList.toggle('flat', scrollTop < 50));
contentChangeEvent.on(() => $navbar.classList.add('flat'));

export interface NavbarPathSegmentSpecifier {
  display: string;
  hash: string | null;
}

export interface NavbarPathSegment extends NavbarPathSegmentSpecifier {
  $anchor: HTMLElement;
  $arrow: HTMLDivElement;
}

const currentNavbarPath: Array<NavbarPathSegment> = [];

function compareNavbarPathSegment(
  a: NavbarPathSegmentSpecifier,
  b: NavbarPathSegmentSpecifier,
) {
  return a.display === b.display && a.hash === b.hash;
}

function removeElement($element: HTMLElement) {
  if (animation.getValue() && delayedLayout === Layout.MAIN) {
    $element.style.left = `${$element.offsetLeft}px`;
    $element.classList.add('exiting');
    setTimeout(() => {
      $element.remove();
    }, 500);
  } else {
    $element.remove();
  }
}

function removeNavbarPathSegment(segment: NavbarPathSegment) {
  removeElement(segment.$anchor);
  removeElement(segment.$arrow);
}

function createNavbarPathSegment(segmentSpecifier: NavbarPathSegmentSpecifier): NavbarPathSegment {
  const $arrow = h('.arrow', '>') as HTMLDivElement;
  const $anchor = segmentSpecifier.hash === null
    ? h('.anchor', segmentSpecifier.display) as HTMLElement
    : h('a.button.anchor', {
      href: segmentSpecifier.hash,
    }, segmentSpecifier.display) as HTMLElement;
  $navbarPathContainer.appendChild($arrow);
  $navbarPathContainer.appendChild($anchor);
  if (animation.getValue() && delayedLayout === Layout.MAIN) {
    $arrow.classList.add('entering');
    $anchor.classList.add('entering');
    forceReflow($anchor);
    $arrow.classList.remove('entering');
    $anchor.classList.remove('entering');
  }
  return {
    $arrow,
    $anchor,
    ...segmentSpecifier,
  };
}

export function setNavbarPath(newNavbarPath: Array<NavbarPathSegmentSpecifier>) {
  let firstDifferentIndex = 0;
  while (
    currentNavbarPath.length > firstDifferentIndex &&
    newNavbarPath.length > firstDifferentIndex &&
    compareNavbarPathSegment(
      currentNavbarPath[firstDifferentIndex],
      newNavbarPath[firstDifferentIndex]
    )
  ) {
    firstDifferentIndex++;
  }

  // Remove extras from current navbar path
  for (let i = currentNavbarPath.length - 1; i >= firstDifferentIndex; i--) {
    removeNavbarPathSegment(currentNavbarPath[i]);
  }
  currentNavbarPath.length = firstDifferentIndex; // Shorten the array

  // Add new segments
  for (let i = firstDifferentIndex; i < newNavbarPath.length; i++) {
    currentNavbarPath.push(createNavbarPathSegment(newNavbarPath[i]));
  }
}

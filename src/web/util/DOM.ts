import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';

export function id<T extends HTMLElement = HTMLDivElement>(id: string) {
  return document.getElementById(id) as T;
}

export function getTextNodes(parent: HTMLElement, initArray?: Array<Text>) {
  const textNodes: Array<Text> = initArray || [];
  let pointer: Node | null = parent.firstChild;
  while (pointer !== null) {
    if (pointer instanceof HTMLElement) {
      getTextNodes(pointer, textNodes);
    }
    if (pointer instanceof Text) {
      textNodes.push(pointer);
    }
    pointer = pointer.nextSibling;
  }
  return textNodes;
}

const selectNodeDebugLogger = new DebugLogger('Select Node');
export function selectNode(node: Node) {
  try {
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (error) {
    selectNodeDebugLogger.log('Failed to select node: ', node, '; Error: ', error);
  }
}

export function isAnyParent(
  $element: HTMLElement | null,
  predicate: (node: HTMLElement) => boolean,
) {
  while ($element !== null) {
    if (predicate($element)) {
      return true;
    }
    $element = $element.parentElement;
  }
  return false;
}

export function insertAfter(
  $newElement: HTMLElement,
  $referencingElement: HTMLElement,
) {
  $referencingElement.parentElement!.insertBefore(
    $newElement,
    $referencingElement.nextSibling,
  );
}

export function insertAfterH1(
  $newElement: HTMLElement,
  $parent: HTMLElement,
) {
  const $first = $parent.firstChild;
  if (
    $first !== null &&
    $first instanceof HTMLHeadingElement &&
    $first.tagName.toLowerCase() === 'h1'
  ) {
    insertAfter($newElement, $first);
  } else {
    $parent.prepend($newElement);
  }
}

export function externalLink(text: string, href: string) {
  return h('a.regular', {
    target: '_blank',
    href,
    rel: 'noopener noreferrer',
  }, text);
}

export function linkButton(text: string, callback: () => void) {
  return h('a.regular', {
    href: '#',
    onclick: ((event: any) => {
      event.preventDefault();
      callback();
    }),
  }, text);
}

export function forceReflow($element: HTMLElement) {
  // tslint:disable-next-line:no-unused-expression
  $element.offsetHeight;
}

export function autoExpandTextArea($textarea: HTMLTextAreaElement, minHeightPx: number = 120) {
  function update() {
    $textarea.style.height = `1px`;
    $textarea.style.height = `${Math.max(minHeightPx, $textarea.scrollHeight)}px`;
  }
  $textarea.addEventListener('input', update, false);
  setTimeout(update, 1);
  return update;
}

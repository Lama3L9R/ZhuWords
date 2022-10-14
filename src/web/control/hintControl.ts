import { h } from '../hs';

// Promise queue
let current: Promise<void> = Promise.resolve();

export function createHint(text: string, timeMs = 2000) {
  current = current.then(async () => {
    const $hint = h('.hint', text) as HTMLDivElement;
    document.body.appendChild($hint);
    $hint.style.opacity = '0';
    // tslint:disable-next-line:no-unused-expression
    $hint.offsetWidth;
    $hint.style.removeProperty('opacity');
    await new Promise(resolve => setTimeout(resolve, timeMs));
    $hint.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 500));
    $hint.remove();
  });
}

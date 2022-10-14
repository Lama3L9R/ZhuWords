import { BROKEN_LINK_DESC, BROKEN_LINK_OK, BROKEN_LINK_TITLE } from '../constant/messages';
import { redirects } from '../constant/redirects';
import { DebugLogger } from '../DebugLogger';
import { Event } from '../Event';
import { chapterPathHandler } from './chapterControl';
import { handleMainMenu, menuPathHandler } from './menuControl';
import { mirrorLandingHandler } from './mirrorControl';
import { notify } from './modalControl';
import { pagePathHandler } from './pageControl';

const debugLogger = new DebugLogger('Follow Query');

/**
 * Example:
 *   If the URL is "https://wt.tepis.me/#/chapter/a/b~selection=1,2,3,4~another=wow"
 *   path will be "a/b"
 *   args will be {selection: "1,2,3,4"}
 * Returns whether the handling was successful
 */
export type PathHandler = (path: string, args: Map<string, string>) => boolean;

export const onPathHandled = new Event<{ handlerId: string }>();

let pathHandlers: Map<string, PathHandler>;

export function initPathHandlers() {
  pathHandlers = new Map([
    ['chapter', chapterPathHandler],
    ['page', pagePathHandler],
    ['menu', menuPathHandler],
    ['mirror-landing', mirrorLandingHandler],
  ]);
}

export function followQuery() {
  if (window.location.hash === '') {
    document.title = '朱语';
    // No hash, go to main menu.
    handleMainMenu();
    return;
  }
  const segments = window.location.hash.split('~').map(decodeURIComponent);
  // First segment is the page specifier
  let pageSpecifier = segments[0];
  const args = new Map(segments.slice(1).map(arg => {
    const split = arg.split('=');
    if (split.length === 2) {
      return [split[0], split[1]];
    } else {
      return [split[0], ''];
    }
  }));
  // Legacy conversion
  if (!pageSpecifier.startsWith('#/')) {
    // URL looks like https://wt.tepis.me/#a/b
    // This is a legacy URL. Now convert it to the new style.
    pageSpecifier = `#/chapter/${pageSpecifier.substr('#'.length)}`;
    if (window.location.search !== '') {
      // There are query parameters, which were previously used for saving selections
      const match = /^\?selection=((?:0|[1-9][0-9]*),(?:0|[1-9][0-9]*),(?:0|[1-9][0-9]*),(?:0|[1-9][0-9]*))$/.exec(window.location.search);
      if (match !== null) {
        args.set('selection', match[1]);
      }
    }
  }
  // At this point, page specifier should look like #/chapter/xxxx
  pageSpecifier = pageSpecifier.substr('#/'.length); // Removes #/
  let handlerIdEndIndex = pageSpecifier.indexOf('/'); // Finds the "/" after handlerId
  if (handlerIdEndIndex === -1) {
    // If not found, extend to the entire string
    handlerIdEndIndex = pageSpecifier.length;
  }
  const handlerId = pageSpecifier.substr(0, handlerIdEndIndex); // chapter
  const path = pageSpecifier.substr(handlerIdEndIndex + '/'.length); // xxx
  const handler = pathHandlers.get(handlerId);
  let handled = false;
  if (handler !== undefined) {
    // Found handler
    handled = handler(path, args);
    if (handled) {
      onPathHandled.emit({ handlerId });
    }
  }

  if (!handled) {
    // Try redirects
    for (const redirect of redirects) {
      const newPageSpecifier = redirect(pageSpecifier);
      if (newPageSpecifier !== pageSpecifier) {
        // Redirect
        debugLogger.log('Redirect matched: ', redirect, `\nOld page specifier: ${pageSpecifier}\nNew page specifier: ${newPageSpecifier}`);
        window.location.hash = '#/' + [newPageSpecifier, ...segments.slice(1)].join('~');
        return;
      }
    }
    debugLogger.log(`${redirects.length} possible redirects processed. None matched.`);
    notify(BROKEN_LINK_TITLE, BROKEN_LINK_DESC, BROKEN_LINK_OK);
    document.title = '朱语';
    window.history.replaceState(null, '朱语', window.location.pathname);
    followQuery();
  }
}

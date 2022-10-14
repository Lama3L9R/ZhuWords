// !!! Super spaghetti code warning !!!

import { GO_TO_MENU, VISIT_COUNT_DESC_0, VISIT_COUNT_DESC_1, VISIT_COUNT_DESC_2, VISIT_COUNT_DISPLAYING, VISIT_COUNT_FAILED, VISIT_COUNT_LOADING, VISIT_COUNT_LOAD_MORE, VISIT_COUNT_LOAD_MORE_FAILED, VISIT_COUNT_LOAD_MORE_LOADING, VISIT_COUNT_TIMES, VISIT_COUNT_TIME_FRAME_ALL, VISIT_COUNT_TIME_FRAME_DAY, VISIT_COUNT_TIME_FRAME_HOUR, VISIT_COUNT_TIME_FRAME_MONTH, VISIT_COUNT_TIME_FRAME_WEEK, VISIT_COUNT_TIME_FRAME_YEAR, VISIT_COUNT_TITLE } from '../constant/messages';
import { backendUrl } from '../control/backendControl';
import { enterMenuMode } from '../control/menuControl';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';
import { AutoCache } from '../data/AutoCache';
import { relativePathLookUpMap } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { commaNumber } from '../util/commaNumber';
import { formatRelativePath } from '../util/formatRelativePath';
import { padName } from '../util/padName';
import { shortNumber } from '../util/shortNumber';

type TimeFrame = 'ALL' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const timeFrames: Array<TimeFrame> = ['ALL', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'];

function getEndpoint(timeFrame: TimeFrame, page: number) {
  if (timeFrame === 'ALL') {
    return `${backendUrl}/stats/chapters/all?page=${page}`;
  } else {
    return `${backendUrl}/stats/chapters/recent?page=${page}&time_frame=${timeFrame}`;
  }
}

const debugLogger = new DebugLogger('Visit Count Logger');

function getTimeFrameText(timeFrame: TimeFrame) {
  switch (timeFrame) {
    case 'ALL': return VISIT_COUNT_TIME_FRAME_ALL;
    case 'HOUR': return VISIT_COUNT_TIME_FRAME_HOUR;
    case 'DAY': return VISIT_COUNT_TIME_FRAME_DAY;
    case 'WEEK': return VISIT_COUNT_TIME_FRAME_WEEK;
    case 'YEAR': return VISIT_COUNT_TIME_FRAME_YEAR;
    case 'MONTH': return VISIT_COUNT_TIME_FRAME_MONTH;
  }
}

function formatTitle(relativePath: string, visitCount: number) {
  return formatRelativePath(relativePath) + ': ' + shortNumber(visitCount, 2) + VISIT_COUNT_TIMES;
}

const visitCountCache = new AutoCache<string, any>(
  endpoint => fetch(endpoint).then(data => data.json()),
  new DebugLogger('Visit Count Cache'),
);

export const visitCount: Page = {
  name: 'visit-count',
  handler: content => {
    setNavbarPath([{ display: VISIT_COUNT_TITLE, hash: null }]);

    const block = content.addBlock();

    block.element.appendChild(h('h1', VISIT_COUNT_TITLE));
    block.element.appendChild(h('p', [
      VISIT_COUNT_DESC_0,
      h('a.regular', { href: '#META/隐私政策.html' }, VISIT_COUNT_DESC_1),
      VISIT_COUNT_DESC_2,
    ]));

    const $status = h('p');
    const $results = h('.visit-count-holder') as HTMLDivElement;
    const $loadMoreButton = h('div.rich') as HTMLDivElement;
    const $loadMoreContainer = h('.button-container.display-none', {
      style: { 'margin-top': '0.5em' },
    }, $loadMoreButton) as HTMLDivElement;

    // Used to determine whether the current request is still needed.
    let currentRequestId = 0;

    // Time frame to be used when clicking load more.
    let nextLoadingTimeFrame: TimeFrame = 'ALL';
    // Page to be load when clicking load more.
    let nextLoadingPage = 2;

    let maxVisits = 0;

    const load = (timeFrame: TimeFrame, page: number) => {
      const endpoint = getEndpoint(timeFrame, page);
      currentRequestId++;
      const requestId = currentRequestId;
      debugLogger.log(`Request ID ${requestId}: Loading visit count info from ${endpoint}.`);
      visitCountCache.get(endpoint).then(data => {
        if (content.isDestroyed || requestId !== currentRequestId) {
          debugLogger.log(`Request ID ${requestId}: Request completed, but the result is abandoned.`);
          return;
        }
        if (page === 1) {
          maxVisits = (data[0]?.visit_count) ?? 0;
          $loadMoreContainer.classList.remove('display-none');
        } else {
          $loadMoreButton.classList.remove('disabled');
        }
        $status.innerText = VISIT_COUNT_DISPLAYING.replace(/\$/g, padName(getTimeFrameText(timeFrame)));
        $loadMoreButton.innerText = VISIT_COUNT_LOAD_MORE;
        // If there is less than 50, stop showing load more button
        $loadMoreContainer.classList.toggle('display-none', data.length !== 50);
        for (const entry of data) {
          if (!relativePathLookUpMap.has(entry.relative_path)) {
            continue;
          }
          $results.appendChild(h(
            'a', {
            style: {
              'width': `${entry.visit_count / maxVisits * 100}%`,
            },
            title: commaNumber(entry.visit_count) + VISIT_COUNT_TIMES,
            href: chapterHref(entry.relative_path),
          }, formatTitle(entry.relative_path, entry.visit_count),
          ));
        }
        nextLoadingPage = page + 1;
      }).catch(error => {
        if (content.isDestroyed || requestId !== currentRequestId) {
          debugLogger.warn(`Request ID ${requestId}: Request failed, but the result is abandoned.`, error);
          return;
        }
        if (page === 1) {
          $status.innerText = VISIT_COUNT_FAILED;
        } else {
          $loadMoreButton.classList.remove('disabled');
          $loadMoreButton.innerText = VISIT_COUNT_LOAD_MORE_FAILED;
        }
      });
    };

    $loadMoreButton.addEventListener('click', () => {
      // Yes, I am doing it. I am using class list as my state keeper.
      if ($loadMoreButton.classList.contains('disabled')) {
        return;
      }
      $loadMoreButton.classList.add('disabled');
      $loadMoreButton.innerText = VISIT_COUNT_LOAD_MORE_LOADING;
      load(nextLoadingTimeFrame, nextLoadingPage);
    });

    const loadTimeFrame = (timeFrame: TimeFrame) => {
      $results.innerHTML = '';
      $status.innerText = VISIT_COUNT_LOADING;
      $loadMoreContainer.classList.add('display-none');
      nextLoadingTimeFrame = timeFrame;
      nextLoadingPage = 2;
      load(timeFrame, 1);
    };

    const ltfButtons: Array<HTMLDivElement> = [];

    /** Load time frame button */
    const createLtfButton = (text: string, timeFrame: TimeFrame) => {
      const $button = h('div.rich', {
        onclick: () => {
          for (const $ltfButton of ltfButtons) {
            $ltfButton.classList.toggle('selected', $ltfButton === $button);
          }
          loadTimeFrame(timeFrame);
        },
      }, text) as HTMLDivElement;
      if (timeFrame === 'ALL') {
        $button.classList.add('selected');
      }
      ltfButtons.push($button);
      return $button;
    };

    block.element.appendChild(h('.button-container', timeFrames.map(timeFrame => createLtfButton(
      getTimeFrameText(timeFrame),
      timeFrame,
    )))),
      block.element.appendChild($status);
    block.element.appendChild($results);
    block.element.appendChild($loadMoreContainer);

    block.element.appendChild(h('div.page-switcher', [
      h('a', {
        href: window.location.pathname,
        onclick: (event: MouseEvent) => {
          event.preventDefault();
          enterMenuMode();
        },
      }, GO_TO_MENU),
    ]));

    loadTimeFrame('ALL');

    return true;
  },
};

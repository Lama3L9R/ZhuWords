import { $e } from '../$e';
import { chapterHref } from '../data/hrefs';
import { Content } from './contentControl';

const endDate = new Date('2022-10-10T23:00:00.000+08:00').getTime();

export function loadStbwjhInfo(content: Content) {
  if (Date.now() > endDate) {
    return;
  }
  content.addBlock({ // TODO: 嗯... 我不理解为什么是写死的，暂且先删了吧
    initElement: (
      <div>

      </div>
    ),
  });
}

import { $e } from '../$e';
import { chapterHref } from '../data/hrefs';
import { Content } from './contentControl';

const endDate = new Date('2022-10-10T23:00:00.000+08:00').getTime();

export function loadStbwjhInfo(content: Content) {
  if (Date.now() > endDate) {
    return;
  }
  content.addBlock({
    initElement: (
      <div>
        <h3>2022.10 色图补完计划投票进行中！</h3>
        <p>想看到你最喜欢的色情小说配图吗？赶紧来参加投票吧！<a className='regular' href={ chapterHref('META/色图补完计划.html') }>点此查看详情</a></p>
      </div>
    ),
  });
}

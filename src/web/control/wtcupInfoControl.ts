import { pageHref } from '../data/hrefs';
import { h } from '../hs';
import { isCandidate } from '../pages/wtcupVote';
import { Content } from './contentControl';

const voteDate = 1640962800000; // new Date('2021-12-31T23:00:00.000+08:00').getTime()
const endDate = 1643382000000; // new Date('2022-01-28T23:00:00.000+08:00').getTime()

export function insertVoteBlock(content: Content, relativePath: string) {
  if (Date.now() < voteDate || Date.now() > endDate) {
    return;
  }
  const title = isCandidate(relativePath) ? '本文正在参与第二届西塔杯年度最佳已完结文章评选！' : '第二届西塔杯年度最佳已完结文章评选正在进行中！';
  content.addBlock({
    initElement: h('div',
      h('h3', title),
      h('p',
        '评选结果由投票决定，欢迎',
        h('a.regular', {
          href: pageHref('wtcup-vote'),
        }, '点此参与投票'),
        '。'
      ),
    ),
  });
}

export function loadWtcupInfoPre(content: Content, relativePath: string) {
  insertVoteBlock(content, relativePath);
}

export function loadWtcupInfo(content: Content, relativePath: string) {
  // content.addBlock({
  //   initElement: h('div',
  //     h('h3', `第二届西塔杯年度最佳已完结文章评选已经结束！`),
  //     h('p',
  //       '西塔杯选出了 2021 年度十佳作品以及三位获奖作者，',
  //       h('a.regular', {
  //         href: chapterHref('META/第二届西塔杯评选.html'),
  //       }, '点此查看评选结果'),
  //       '。'
  //     ),
  //   ),
  // });
  // if (Date.now() < voteDate) {
  //   content.addBlock({
  //     initElement: h('div',
  //       h('h3', `第二届西塔杯年度最佳已完结文章评选即将开始！`),
  //       h('p',
  //         '第二届西塔杯的截稿日期是北京时间 2021 年 12 月 31 日，',
  //         h('a.regular', {
  //           href: chapterHref('META/第二届西塔杯评选.html'),
  //         }, '点此查看西塔杯介绍及参与方式'),
  //         '。'
  //       ),
  //     ),
  //   });
  // } else {
  //   insertVoteBlock(content, relativePath);
  // }
}

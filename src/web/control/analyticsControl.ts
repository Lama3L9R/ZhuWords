import { backendUrl } from './backendControl';
import { AutoCache } from '../data/AutoCache';
import { DebugLogger } from '../DebugLogger';
import { loadChapterEvent } from './chapterControl';

// 《可穿戴科技》统计系统
// 本系统服务端开源，并且不收集任何个人信息。
// 其存在目的仅仅是为了让琳知道有多少读者在看，以满足她的虚荣心。
//
// 服务端源代码：https://github.com/SCLeoX/wt_analytics
// 大佬太强了，Rust写服务端，我准备用Node重写一下（因为rust我不会改）
// TODO: Rewrite backend

const analyticsCache = new AutoCache<string, any>(relativePath => {
  return fetch(backendUrl + '/stats/count', {
    method: 'POST',
    body: relativePath,
  });
}, new DebugLogger('Analytics Cache'));

loadChapterEvent.on((chapterRelativePath) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }
  const startPageSpecifier = window.location.hash.split('~')[0]; // Remove arguments
  // Wait for 5 seconds in order to confirm the user is still reading the same
  // chapter.
  setTimeout(() => {
    if (startPageSpecifier !== window.location.hash.split('~')[0]) {
      return;
    }
    analyticsCache.get(chapterRelativePath);
  }, 5000);
});

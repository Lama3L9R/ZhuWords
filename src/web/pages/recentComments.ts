import { COMMENTS_RECENT_SECTION } from '../constant/messages';
import { loadRecentComments } from '../control/commentsControl';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';

export const recentComments: Page = {
  name: 'recent-comments',
  handler: content => {
    setNavbarPath([{ display: COMMENTS_RECENT_SECTION, hash: null }]);
    loadRecentComments(content);
    return true;
  },
};

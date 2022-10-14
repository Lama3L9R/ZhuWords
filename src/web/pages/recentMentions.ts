import { COMMENTS_MENTION_NO_TOKEN_DESC, COMMENTS_MENTION_NO_TOKEN_TITLE, COMMENTS_MENTION_SECTION } from '../constant/messages';
import { loadRecentMentions } from '../control/commentsControl';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';
import { removeNewMentionLink } from '../control/userControl';
import { h } from '../hs';

export const recentMentions: Page = {
  name: 'recent-mentions',
  handler: content => {
    setNavbarPath([{ display: COMMENTS_MENTION_SECTION, hash: null }]);

    // ! In the name of spaghetti
    setTimeout(() => {
      removeNewMentionLink();
    }, 500);
    localStorage.setItem('lastCheckedMention', String(Date.now()));
    if (localStorage.getItem('token') === null) {
      content.addBlock({
        initElement: h('div',
          h('h1', COMMENTS_MENTION_NO_TOKEN_TITLE),
          h('p', COMMENTS_MENTION_NO_TOKEN_DESC),
        )
      });
    } else {
      loadRecentMentions(content, localStorage.getItem('token')!);
    }
    return true;
  },
};

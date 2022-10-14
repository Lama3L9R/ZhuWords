import { escapeKeyPressEvent } from '../input/keyboard';
import { author } from '../pages/author';
import { recentComments } from '../pages/recentComments';
import { recentMentions } from '../pages/recentMentions';
import { taggingTool } from '../pages/taggingTool';
import { tagSearch } from '../pages/tagSearch';
import { visitCount } from '../pages/visitCount';
import { wtcupVote } from '../pages/wtcupVote';
import { Content, newContent, Side } from './contentControl';
import { PathHandler } from './followQuery';
import { Layout, setLayout } from './layoutControl';
import { enterMenuMode } from './menuControl';

export interface Page {
  name: string;
  handler: (content: Content, pagePath: PagePath) => boolean;
}

const pages: Array<Page> = [
  recentComments,
  visitCount,
  recentMentions,
  author,
  wtcupVote,
  taggingTool,
  tagSearch,
];

class PagePath {
  public constructor(
    private current: string,
    private prefix: string,
  ) {}
  public get() {
    return this.current;
  }
  public set(newPath: string) {
    this.current = newPath;
    window.history.replaceState(null, document.title, this.prefix + newPath);
  }
}

export const pagePathHandler: PathHandler = path => {
  for (const page of pages) {
    if (path === page.name || path.startsWith(page.name + '/')) {
      const content = newContent(Side.RIGHT);
      escapeKeyPressEvent.onceUntil(enterMenuMode, content.leavingEvent);
      setLayout(Layout.MAIN);
      const handleResult = page.handler(content, new PagePath(path.substr(page.name.length + 1), `#/page/${page.name}/`));
      return handleResult;
    }
  }
  return false;
};

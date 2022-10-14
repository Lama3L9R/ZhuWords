import { AUTHOR_PAGE_AS, AUTHOR_PAGE_LINK, AUTHOR_PAGE_WORKS, AUTHOR_PAGE_WORKS_DESC, GO_TO_MENU } from '../constant/messages';
import { getRolePriority } from '../constant/rolePriorities';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';
import { authorInfoMap, relativePathLookUpMap } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { h } from '../hs';
import { formatRelativePath } from '../util/formatRelativePath';
import { padName } from '../util/padName';
export const author: Page = {
  name: 'author',
  handler: (content, pagePath) => {
    const authorName = pagePath.get();
    setNavbarPath([
      { display: '作者列表', hash: '#/menu/章节选择/按作者检索' },
      { display: authorName, hash: null },
    ]);
    const author = authorInfoMap.get(authorName);
    const block = content.addBlock();
    block.element.appendChild(h('h1', authorName));
    if (author?.description !== undefined) {
      block.element.appendChild(h('p', author.description));
    }

    const roleChaptersMap = new Map<string, Array<string>>();

    for (const [relativePath, { chapter: { authors } }] of relativePathLookUpMap.entries()) {
      for (const { name, role } of authors) {
        if (name !== authorName) {
          continue;
        }
        if (!roleChaptersMap.has(role)) {
          roleChaptersMap.set(role, [relativePath]);
        } else {
          roleChaptersMap.get(role)!.push(relativePath);
        }
      }
    }

    block.element.appendChild(h('h2', AUTHOR_PAGE_WORKS));
    block.element.appendChild(h('p', AUTHOR_PAGE_WORKS_DESC.replace('$', padName(authorName))));

    const roleChaptersArray = Array.from(roleChaptersMap);
    roleChaptersArray.sort(([roleA, _], [roleB, __]) => getRolePriority(roleB) - getRolePriority(roleA));
    for (const [role, relativePaths] of roleChaptersArray) {
      block.element.appendChild(h('h4', AUTHOR_PAGE_AS + role));
      const $list = h('ul');
      for (const relativePath of relativePaths) {
        $list.appendChild(h('li',
          formatRelativePath(relativePath),
          '（',
          h('a.regular', {
            href: chapterHref(relativePath),
          }, AUTHOR_PAGE_LINK),
          '）',
        ));
      }
      block.element.appendChild($list);
    }

    block.element.appendChild(h('div.page-switcher', [
      h('a.to-menu', {
        href: window.location.pathname,
        onclick: (event: MouseEvent) => {
          event.preventDefault();
          history.back();
        },
      }, GO_TO_MENU),
    ]));
    return true;
  },
};

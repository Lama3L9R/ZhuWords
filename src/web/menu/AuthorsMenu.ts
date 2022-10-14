import { ItemDecoration, Menu } from '../Menu';
import { relativePathLookUpMap } from '../data/data';
import { pageHref } from '../data/hrefs';
import { shortNumber } from '../util/shortNumber';

export class AuthorsMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase);
    // Cannot use data from authors.json because we need to list every single author
    const authors = new Map<string, number>();
    Array.from(relativePathLookUpMap.values()).forEach(chapterCtx => {
      const chars = chapterCtx.chapter.charsCount ?? 1;
      chapterCtx.chapter.authors.forEach(({ name }) => {
        if (authors.has(name)) {
          authors.set(name, authors.get(name)! + chars);
        } else {
          authors.set(name, chars);
        }
      });
    });
    Array.from(authors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, chars]) => {
        const handle = this.addItem(name, {
          button: true,
          decoration: ItemDecoration.ICON_PERSON,
          link: pageHref(`author/${name}`),
        });
        handle.append(`[${shortNumber(chars)}]`);
      });
  }
}

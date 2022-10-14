export function chapterHref(htmlRelativePath: string) {
  return `#/chapter/${htmlRelativePath}`;
}

export function pageHref(pageName: string) {
  return `#/page/${pageName}`;
}

export function mirrorLandingHref(origin: string, token: string | null, scroll?: number) {
  let href = `${origin}/#/mirror-landing`;
  if (token !== null) {
    href += `~token=${token}`;
  }
  if (scroll !== undefined) {
    href += `~scroll=${scroll}`;
  }
  return href;
}

export function tagSearchHref(tag: string) {
  return `#/page/tag-search/${tag}`;
}

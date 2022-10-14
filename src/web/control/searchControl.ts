import { Chapter } from '../../Data';
import { relativePathLookUpMap } from '../data/data';
import { canChapterShown } from './chapterControl';

function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 1));
}

export type SearchInput = Array<{ searchTag: string, type: 'required' | 'excluded' | 'favored' }>;

function matchTag(tagList: Array<string>, searchTag: string) {
  if (tagList.includes(searchTag)) {
    return searchTag;
  }
  if (searchTag.includes('（')) {
    // Search tag has specified tag variant
    return null;
  }
  // tagList may contain tag variant of search tag
  for (const tag of tagList) {
    if (tag.startsWith(searchTag + '（')) {
      return tag;
    }
  }
  return null;
}

export async function search(searchInput: SearchInput) {
  let sliceStartTime = Date.now();

  const candidates: Array<{
    chapter: Chapter,
    score: number,
    matchedTags: Array<string>,
  }> = [];

  eachChapter: for (const { chapter } of relativePathLookUpMap.values()) {
    if (Date.now() - sliceStartTime > 10) {
      await nextTick();
      sliceStartTime = Date.now();
    }
    if (!canChapterShown(chapter)) {
      continue;
    }
    if (chapter.tags === undefined) {
      continue;
    }
    let score = 0;
    const matchedTags: Array<string> = [];
    for (const { searchTag, type } of searchInput) {
      const matchedTag = matchTag(chapter.tags, searchTag);
      if (type === 'excluded') {
        if (matchedTag !== null) {
          continue eachChapter;
        }
        score++;
      } else if (type === 'required') {
        if (matchedTag === null) {
          continue eachChapter;
        }
        score++;
        matchedTags.push(matchedTag);
      } else if (type === 'favored' && matchedTag !== null) {
        score++;
        matchedTags.push(matchedTag);
      }
    }
    if (score > 0) {
      candidates.push({
        score,
        chapter,
        matchedTags,
      });
    }
  }

  candidates.sort((a, b) => (a.score !== b.score)
    ? (b.score - a.score)
    : (b.chapter.creationTime - a.chapter.creationTime));

 return candidates;
}

import { Chapter } from '../../Data';
import { relativePathLookUpMap } from '../data/data';
import { canChapterShown } from './chapterControl';

function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 1));
}

export async function recommend(sourceChapter: Chapter) {
  if (sourceChapter.tags === undefined) {
    return null;
  }
  const recommendations: Array<{ score: number, chapter: Chapter, }> = [];
  let sliceStartTime = Date.now();
  const originalSet = new Set(sourceChapter.tags);
  for (const { chapter } of relativePathLookUpMap.values()) {
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
    const union = new Set(originalSet);
    let intersectionSize = 0;
    for (const tag of chapter.tags) {
      if (originalSet.has(tag)) {
        intersectionSize++;
      }
      union.add(tag);
    }
    const jaccardIndex = intersectionSize / union.size;
    if (jaccardIndex !== 0) {
      recommendations.push({
        score: jaccardIndex,
        chapter,
      });
    }
  }
  return recommendations.sort((a, b) => b.score - a.score);
}
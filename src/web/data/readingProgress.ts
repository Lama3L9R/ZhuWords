// Tracking reading progress

import { getDb, untilSuccess } from './db';

interface Entry {
  relativePath: string;
  lastRead: Date;
  /** 0 - 1 */
  progress: number;
}

async function getReadonlyStore() {
  const db = await getDb();
  return db.transaction('readingProgress').objectStore('readingProgress');
}

async function getStore() {
  const db = await getDb();
  return db.transaction('readingProgress', 'readwrite').objectStore('readingProgress');
}

export async function updateChapterProgress(relativePath: string, progress: number) {
  const store = await getStore();
  const result = (await untilSuccess(store.get(relativePath))) as (undefined | Entry);
  await untilSuccess(store.put({
    relativePath,
    lastRead: new Date(),
    progress: Math.max(progress, result?.progress ?? 0),
  }));
}

export async function getHistory(entries = 20) {
  const store = await getReadonlyStore();
  const lastReadIndex = store.index('lastRead');
  return new Promise<Array<Entry>>(resolve => {
    const results: Array<Entry> = [];
    lastReadIndex.openCursor(null, 'prev').onsuccess = function() {
      const cursor = this.result;
      if (cursor !== null) {
        results.push(cursor.value);
        if (results.length >= entries) {
          resolve(results);
        } else {
          cursor.continue();
        }
      } else {
        resolve(results);
      }
    };
  });
}

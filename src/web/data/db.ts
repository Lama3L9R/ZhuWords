import { DebugLogger } from '../DebugLogger';

let db: null | Promise<IDBDatabase> = null;

const debugLogger = new DebugLogger('IndexedDB');

const migrations = new Map<number, (db: IDBDatabase) => void>([
  [0, db => {
    const readingProgress = db.createObjectStore('readingProgress', { keyPath: 'relativePath' });
    readingProgress.createIndex('lastRead', 'lastRead');
  }],
  [1, db => {
    db.createObjectStore('simpleKV');
  }]
]);

/**
 * Turn an event target into a promise.
 * ! NOTE: This does not handle onerror, as errors are expected to bubble up.
 */
 export function untilSuccess<TResult>(target: IDBRequest<TResult>) {
  return new Promise<TResult>(resolve => {
    target.onsuccess = function() {
      resolve(this.result);
    };
  });
}

type DbKVKey<TValue> = { key: string };

export function dbKVKey<TValue>(key: string): DbKVKey<TValue> {
  return { key };
}

export async function dbKVSet<TValue>(key: DbKVKey<TValue>, value: TValue) {
  const db = await getDb();
  const store = db.transaction('simpleKV', 'readwrite').objectStore('simpleKV');
  await untilSuccess(store.put(value, key.key));
}

export async function dbKVGet<TValue>(key: DbKVKey<TValue>): Promise<TValue | null> {
  const db = await getDb();
  const store = db.transaction('simpleKV', 'readwrite').objectStore('simpleKV');
  return await untilSuccess(store.get(key.key)) ?? null;
}

export function getDb() {
  if (db === null) {
    db = new Promise((resolve, reject) => {
      debugLogger.log('Open database');
      const request = window.indexedDB.open('main', 2);
      request.onsuccess = () => {
        debugLogger.log('Database successfully opened.');
        resolve(request.result);
      };
      request.onerror = () => {
        debugLogger.error('Database failed to open: ', request.error);
        reject(request.error);
      };
      request.onupgradeneeded = event => {
        debugLogger.log(`Migrating from ${event.oldVersion} to ${event.newVersion!}`);
        const db = request.result;
        for (let version = event.oldVersion; version < event.newVersion!; version++) {
          const migration = migrations.get(version);
          if (migration === undefined) {
            throw new Error(`Missing migration for version=${version}.`);
          }
          debugLogger.log(`Running migration ${version} -> ${version + 1}`);
          migration(db);
        }
        debugLogger.log('Migration completed');
      };
    });
  }
  return db;
}

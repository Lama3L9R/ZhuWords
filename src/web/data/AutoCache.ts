import { DebugLogger } from '../DebugLogger';

export class AutoCache<TKey, TValue> {
  private map = new Map<TKey, Promise<TValue>>();
  public constructor(
    private loader: (key: TKey) => Promise<TValue>,
    private logger: DebugLogger,
  ) {}
  public delete(key: TKey) {
    this.map.delete(key);
  }
  public get(key: TKey): Promise<TValue> {
    let value = this.map.get(key);
    if (value === undefined) {
      this.logger.log(`Start loading for key=${key}.`);
      value = this.loader(key);
      this.map.set(key, value);
      value.catch(error => {
        this.map.delete(key);
        this.logger.warn(
          `Loader failed for key=${key}. Cache removed.`, error,
        );
      });
    } else {
      this.logger.log(`Cached value used for key=${key}.`);
    }
    return value;
  }
}

export class AutoSingleCache<TValue> extends AutoCache<null, TValue> {
  public constructor(
    loader: () => Promise<TValue>,
    logger: DebugLogger,
  ) {
    super(loader, logger);
  }
  public delete() {
    super.delete(null);
  }
  public get(): Promise<TValue> {
    return super.get(null);
  }
}


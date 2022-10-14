type Listener<T> = (arg: T, listener: Listener<T>) => void;

export class Event<T = void> {
  private listeners: Set<Listener<T>> | null = null;
  private onceListeners: Set<Listener<T>> | null = null;

  private isEmitting: boolean = false;
  private queue: Array<() => void> = [];

  private runWhenNotEmitting(fn: () => void) {
    if (this.isEmitting) {
      this.queue.push(fn);
    } else {
      fn();
    }
  }

  public on(listener: Listener<T>) {
    this.runWhenNotEmitting(() => {
      if (this.listeners === null) {
        this.listeners = new Set();
      }
      this.listeners.add(listener);
    });
    return listener;
  }
  public onUntil(listener: Listener<T>, event: Event<any>) {
    this.runWhenNotEmitting(() => {
      this.on(listener);
      event.once(() => this.off(listener));
    });
  }
  public off(listener: Listener<T>) {
    this.runWhenNotEmitting(() => {
      if (this.listeners !== null) {
        this.listeners.delete(listener);
      }
      if (this.onceListeners !== null) {
        this.onceListeners.delete(listener);
      }
    });
  }
  public once(onceListener: (arg: T) => void) {
    this.runWhenNotEmitting(() => {
      if (this.onceListeners === null) {
        this.onceListeners = new Set();
      }
      this.onceListeners.add(onceListener);
    });
    return onceListener;
  }
  public onceUntil(listener: (arg: T) => void, event: Event<any>) {
    this.runWhenNotEmitting(() => {
      this.once(listener);
      event.once(() => this.off(listener));
    });
  }
  public expect(filter?: (arg: T) => boolean): Promise<T> {
    if (this.isEmitting) {
      return new Promise(resolve => {
        this.queue.push(() => {
          this.expect(filter).then(resolve);
        });
      });
    }
    if (filter === undefined) {
      return new Promise(resolve => this.once(resolve));
    }
    return new Promise(resolve => {
      const listener = this.on(arg => {
        if (!filter(arg)) {
          return;
        }
        this.off(listener);
        resolve(arg);
      });
    });
  }
  public emit(arg: T) {
    this.runWhenNotEmitting(() => {
      this.isEmitting = true;
      if (this.listeners !== null) {
        this.listeners.forEach(listener => listener(arg, listener));
      }
      if (this.onceListeners !== null) {
        this.onceListeners.forEach(onceListener => onceListener(arg, onceListener));
        this.onceListeners = new Set();
      }
      this.isEmitting = false;
      this.queue.forEach(task => task());
      this.queue.length = 0;
    });
  }
}

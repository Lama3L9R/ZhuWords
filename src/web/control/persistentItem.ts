export class PersistentItem<T> {
  public constructor(
    private key: string,
    private serializer: (value: T) => string,
    private deserializer: (str: string) => T | null,
  ) {}
  public getValue(): T | null {
    const str = window.localStorage.getItem(this.key);
    if (str === null) {
      return null;
    }
    return this.deserializer(str);
  }
  public setValue(value: T) {
    window.localStorage.setItem(this.key, this.serializer(value));
  }
  public remove() {
    window.localStorage.removeItem(this.key);
  }
  public setValueNullable(value: T | null) {
    if (value === null) {
      this.remove();
    } else {
      this.setValue(value);
    }
  }
  public exists(): boolean {
    return this.getValue() !== null;
  }
}

const identity = <T>(input: T) => input;

export class StringPersistentItem extends PersistentItem<string> {
  public constructor(key: string) {
    super(key, identity, identity);
  }
}

const numberToString = (input: number) => String(input);
const stringToNumber = (input: string) => {
  const num = +input;
  if (Number.isNaN(num)) {
    return null;
  }
  return num;
};

export class NumberPersistentItem extends PersistentItem<number> {
  public constructor(key: string) {
    super(key, numberToString, stringToNumber);
  }
}

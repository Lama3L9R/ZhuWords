/**
 * This is used to generate ids for interpolated values in sections. Name
 * generator is used in order to prevent reader from learning all the variable
 * names simply by inspecting elements. Of course, reader can still read the
 * compiled tree structure or the source code for the corresponding passage.
 * However, that will involve slightly more effort.
 */
export class SimpleIdGenerator {
  private charPool!: Array<string>;
  private index: number = 0;
  private getName(index: number): string {
    if (index >= this.charPool.length) {
      return this.getName(Math.floor(index / this.charPool.length) - 1)
        + this.charPool[index % this.charPool.length];
    }
    return this.charPool[index];
  }
  public next() {
    if (this.charPool === undefined) {
      this.charPool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
        .split('')
        .sort(() => Math.random() - 0.5);
    }
    return this.getName(this.index++);
  }
}

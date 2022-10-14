export class ChainedCanvas {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  private promise: Promise<any> = Promise.resolve();
  public constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
  }
  public updatePromise(updater: () => Promise<any>) {
    this.promise = this.promise.then(updater);
  }
  public onResolve(callback: () => void) {
    this.promise.then(callback);
  }
  public getWidth() {
    return this.canvas.width;
  }
  public getHeight() {
    return this.canvas.height;
  }
}

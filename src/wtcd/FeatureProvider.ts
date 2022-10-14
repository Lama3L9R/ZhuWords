/**
 * Implement methods to provide additional feature support.
 */
export class FeatureProvider {
  /**
   * When using the canvas functionality of WTCD, user may choose to put an
   * external image to the canvas. Whenever that happens, this method is called.
   */
  loadImage(path: string): Promise<CanvasImageSource> {
    return Promise.reject('Loading images is not allowed.');
  }
  /**
   * When using the canvas functionality of WTCD, user may choose to use a
   * custom font in the canvas. Whenever that happens, this method is called.
   *
   * Please make sure the font is loaded in DOM via document.fonts#add
   *
   * Returns the name of the font
   */
  loadFont(identifier: string): Promise<string> {
    return Promise.reject('Loading fonts is not allowed.');
  }
  /**
   * Draw loading screen on the provided canvas.
   */
  drawLoadingCanvas($canvas: HTMLCanvasElement): void {
    return undefined;
  }
}

export const defaultFeatureProvider = new FeatureProvider();

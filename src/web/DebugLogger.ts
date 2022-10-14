import { materialDarkColors } from './constant/materialDarkColors';
import { developerMode } from './data/settings';
import { stringHash } from './util/stringHash';

export class DebugLogger {
  private prefix: string;
  private css: string;
  public constructor(
    name: string,
  ) {
    this.prefix = '%c' + name;
    this.css = `background-color: #` +
      materialDarkColors[
        Math.abs(stringHash(name)) % materialDarkColors.length
      ] +
      '; border-radius: 0.3em; padding: 0 0.3em; color: white';
  }
  public log(...stuff: any) {
    if (!developerMode.getValue()) {
      return;
    }
    console.info(this.prefix, this.css, ...stuff);
  }
  public warn(...stuff: any) {
    console.warn(this.prefix, this.css, ...stuff);
  }
  public error(...stuff: any) {
    console.error(this.prefix, this.css, ...stuff);
  }
}

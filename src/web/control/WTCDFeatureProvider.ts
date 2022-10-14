import { FeatureProvider } from '../../wtcd/FeatureProvider';
import { resolvePath } from '../util/resolvePath';
import { DebugLogger } from '../DebugLogger';
import { Chapter } from '../../Data';
import { AutoCache } from '../data/AutoCache';
import { loadGoogleFonts } from '../util/loadGooleFonts';
import { WTCD_CANVAS_LOADING } from '../constant/messages';

const debugLogger = new DebugLogger('WTCD Feature Provider');
const imageCache = new AutoCache<string, HTMLImageElement>(url => {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}.`));
    image.src = url;
  });
}, new DebugLogger('WTCD Image Cache'));
const fontsCache = new AutoCache<string, string>(identifier => {
  // Identifier should look like: "googleFonts:ZCOOL KuaiLe"
  const modeSeparatorIndex = identifier.indexOf(':');
  if (modeSeparatorIndex === -1) {
    return Promise.reject(new Error('Cannot find mode separator ":".'));
  }
  const mode = identifier.substr(0, modeSeparatorIndex);
  if (mode !== 'googleFonts') {
    return Promise.reject(new Error(`Unknown mode: "${mode}".`));
  }
  return loadGoogleFonts(identifier.substr(modeSeparatorIndex + 1));
}, new DebugLogger('WTCD Font Cache'));
export class WTCDFeatureProvider extends FeatureProvider {
  public constructor(
    private chapter: Chapter
  ) {
    super();
  }
  public loadImage(path: string): Promise<CanvasImageSource> {
    if (!path.startsWith('./')) {
      return Promise.reject(new Error('Path has to be relative and start ' +
      `with "./". Received: "${path}"`));
    }
    let resolved = resolvePath(
      'chapters',
      this.chapter.htmlRelativePath,
      '..',
      path.substr(2),
    );
    if (resolved === null) {
      return Promise.reject(new Error(`Failed to resolve path: "${path}".`));
    }
    resolved = '/' + resolved;
    debugLogger.log('Resolved from:', path, 'to:', resolved);
    return imageCache.get(resolved);
  }
  public loadFont(identifier: string): Promise<string> {
    return fontsCache.get(identifier);
  }
  public drawLoadingCanvas($canvas: HTMLCanvasElement) {
    const ctx = $canvas.getContext('2d')!;
    ctx.font = `${$canvas.width / 40}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = $canvas.width / 200;
    ctx.strokeText(WTCD_CANVAS_LOADING, $canvas.width / 2, $canvas.height / 2);
    ctx.fillStyle = 'white';
    ctx.fillText(WTCD_CANVAS_LOADING, $canvas.width / 2, $canvas.height / 2);
  }
}

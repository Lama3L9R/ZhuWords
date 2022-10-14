import { DebugLogger } from '../DebugLogger';
import { matchAll } from './matchAll';

const debugLogger = new DebugLogger('Load Google Fonts');
const parseRegex = /@font-face {[^}]*?font-family:\s*['"]?([^;'"]+?)['"]?;[^}]*?font-style:\s*([^;]+);[^}]*?font-weight:\s*([^;]+);[^}]*?src:\s*([^;]+);[^}]*?(?:unicode-range:\s*([^;]+))?;/g;
export async function loadGoogleFonts(fontName: string) {
  const cssLink = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}`;
  debugLogger.log(`Loading font: "${fontName}" from "${cssLink}".`);
  const response = await fetch(cssLink);
  const text = await response.text();
  const matches = matchAll(text, parseRegex);
  return Promise.all(matches.map(match => new FontFace(match[1], match[4], {
    style: match[2],
    weight: match[3],
    unicodeRange: match[5],
  }).load()))
    .then(fontFaces => fontFaces.map(fontFace => (document.fonts as any).add(fontFace)))
    .then(() => fontName);
}

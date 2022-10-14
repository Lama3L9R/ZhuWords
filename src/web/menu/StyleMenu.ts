import { stylePreviewArticle } from '../constant/stylePreviewArticle';
import { newContent, Side } from '../control/contentControl';
import { Layout } from '../control/layoutControl';
import { processElements } from '../control/processElements';
import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { ItemDecoration, Menu } from '../Menu';

interface StyleDef {
  readonly rectBgColor: string;
  readonly paperBgColor: string;
  readonly keyColor: [number, number, number];
  readonly linkColor: string;
  readonly linkHoverColor: string;
  readonly linkActiveColor: string;
  readonly commentColor: string;

  readonly keyIsDark: boolean;

  readonly contentBlockWarningColor: string;
}

class Style {
  public static currentlyEnabled: Style | null = null;
  private static themeColorMetaTag: HTMLMetaElement | null = null;
  private styleSheet: StyleSheet | null = null;
  private debugLogger: DebugLogger;
  public constructor(
    public readonly name: string,
    public readonly def: StyleDef,
  ) {
    this.debugLogger = new DebugLogger(`Style (${name})`);
  }
  private injectStyleSheet() {
    const $style = document.createElement('style');
    document.head.appendChild($style);
    const sheet = $style.sheet as CSSStyleSheet;
    sheet.disabled = true;

    const attemptInsertRule = (rule: string) => {
      try {
        sheet.insertRule(rule);
      } catch (error) {
        this.debugLogger.error(`Failed to inject rule "${rule}".`, error);
      }
    };

    const key = `rgb(${this.def.keyColor.join(',')})`;
    const keyAlpha = (alpha: number) => `rgba(${this.def.keyColor.join(',')},${alpha})`;

    // attemptInsertRule(`.container { color: ${key}; }`);
    // attemptInsertRule(`.menu { color: ${key}; }`);
    attemptInsertRule(`.menu .button:active::after { background-color: ${key}; }`);
    attemptInsertRule(`.button::after { background-color: ${key}; }`);
    attemptInsertRule(`body { background-color: ${this.def.paperBgColor}; }`);
    // attemptInsertRule(`.rect { background-color: ${this.def.rectBgColor}; }`);

    // attemptInsertRule(`.rect.reading>div { background-color: ${this.def.paperBgColor}; }`);
    // attemptInsertRule(`.rect.reading>div { color: ${key}; }`);
    // attemptInsertRule(`.rect.reading>.content a { color: ${this.def.linkColor}; }`);
    // attemptInsertRule(`.rect.reading>.content a:hover { color: ${this.def.linkHoverColor}; }`);
    // attemptInsertRule(`.rect.reading>.content a:active { color: ${this.def.linkActiveColor}; }`);
    // attemptInsertRule(`.rect.reading .early-access.content-block { background-color: ${this.def.contentBlockEarlyAccessColor}; }`);
    // attemptInsertRule(`.rect>.comments>div { background-color: ${this.def.commentColor}; }`);
    // attemptInsertRule(`@media (min-width: 901px) { ::-webkit-scrollbar-thumb { background-color: ${this.def.paperBgColor}; } }`);

    // attemptInsertRule(`.rect>.comments>.create-comment::before { background-color: ${key}; }`);

    attemptInsertRule(`:root { --comment-color:${this.def.commentColor}; }`);
    attemptInsertRule(`:root { --content-block-warning-color:${this.def.contentBlockWarningColor}; }`);

    attemptInsertRule(`:root { --rect-bg-color: ${this.def.rectBgColor}; }`);
    attemptInsertRule(`:root { --paper-bg-color: ${this.def.paperBgColor}; }`);
    attemptInsertRule(`:root { --link-color: ${this.def.linkColor}; }`);
    attemptInsertRule(`:root { --link-hover-color: ${this.def.linkHoverColor}; }`);
    attemptInsertRule(`:root { --link-active-color: ${this.def.linkActiveColor}; }`);

    attemptInsertRule(`:root { --key: ${key}; }`);
    attemptInsertRule(`:root { --key-opacity-01: ${keyAlpha(0.1)}; }`);
    attemptInsertRule(`:root { --key-opacity-014: ${keyAlpha(0.14)}; }`);
    attemptInsertRule(`:root { --key-opacity-015: ${keyAlpha(0.15)}; }`);
    attemptInsertRule(`:root { --key-opacity-023: ${keyAlpha(0.23)}; }`);
    attemptInsertRule(`:root { --key-opacity-05: ${keyAlpha(0.5)}; }`);
    attemptInsertRule(`:root { --key-opacity-07: ${keyAlpha(0.7)}; }`);
    attemptInsertRule(`:root { --key-opacity-007: ${keyAlpha(0.07)}; }`);
    attemptInsertRule(`:root { --key-opacity-004: ${keyAlpha(0.04)}; }`);

    attemptInsertRule(`:root { --button-color: ${this.def.commentColor}; }`);

    this.styleSheet = sheet;
  }
  public activate() {
    if (Style.currentlyEnabled !== null) {
      const currentlyEnabled = Style.currentlyEnabled;
      if (currentlyEnabled.styleSheet !== null) {
        currentlyEnabled.styleSheet.disabled = true;
      }
    }
    if (this.styleSheet === null) {
      this.injectStyleSheet();
    }
    this.styleSheet!.disabled = false;
    window.localStorage.setItem('style', this.name);

    if (Style.themeColorMetaTag === null) {
      Style.themeColorMetaTag = h('meta', {
        name: 'theme-color',
        content: this.def.paperBgColor,
      });
      document.head.appendChild(Style.themeColorMetaTag);
    } else {
      Style.themeColorMetaTag.content = this.def.paperBgColor;
    }

    Style.currentlyEnabled = this;
  }
}

const darkKeyLinkColors = {
  linkColor: '#00E',
  linkHoverColor: '#F00',
  linkActiveColor: '#00E',
};
const lightKeyLinkColors = {
  linkColor: '#7AB2E2',
  linkHoverColor: '#5A92C2',
  linkActiveColor: '#5A92C2',
};

const styles = [
  new Style('可穿戴科技（默认）', {
    rectBgColor: '#444',
    paperBgColor: '#333',
    keyColor: [221, 221, 221],
    ...lightKeyLinkColors,
    contentBlockWarningColor: '#E65100',
    commentColor: '#444',

    keyIsDark: false,
  }),
  new Style('白纸', {
    rectBgColor: '#EFEFED',
    paperBgColor: '#FFF',
    keyColor: [0, 0, 0],
    ...darkKeyLinkColors,
    contentBlockWarningColor: '#FFE082',
    commentColor: '#F5F5F5',

    keyIsDark: true,
  }),
  new Style('夜间', {
    rectBgColor: '#272B36',
    paperBgColor: '#38404D',
    keyColor: [221, 221, 221],
    ...lightKeyLinkColors,
    contentBlockWarningColor: '#E65100',
    commentColor: '#272B36',

    keyIsDark: false,
  }),
  new Style('羊皮纸', {
    rectBgColor: '#D8D4C9',
    paperBgColor: '#F8F4E9',
    keyColor: [85, 40, 48],
    ...darkKeyLinkColors,
    contentBlockWarningColor: '#FFE082',
    commentColor: '#F9EFD7',

    keyIsDark: true,
  }),
  new Style('巧克力', {
    rectBgColor: '#2E1C11',
    paperBgColor: '#3A2519',
    keyColor: [221, 175, 153],
    ...lightKeyLinkColors,
    contentBlockWarningColor: '#E65100',
    commentColor: '#2C1C11',

    keyIsDark: false,
  }),
];

export class StyleMenu extends Menu {
  public constructor(urlBase: string) {
    super(urlBase, Layout.SIDE);
    const handles = styles.map(style => {
      const handle = this.addItem(style.name, { button: true, decoration: ItemDecoration.SELECTABLE })
        .onClick(() => {
          style.activate();
          handles.forEach(handle => handle.setSelected(false));
          handle.setSelected(true);
        });
      if (window.localStorage.getItem('style') === style.name) {
        handle.setSelected(true);
      }
      return handle;
    });

    const content = newContent(Side.RIGHT);
    const $div = content.addBlock().element;
    $div.innerHTML = stylePreviewArticle;
    processElements($div);
  }
}

const usedStyle = window.localStorage.getItem('style');
let flag = false;
for (const style of styles) {
  if (usedStyle === style.name) {
    style.activate();
    flag = true;
    break;
  }
}
if (!flag) {
  styles[0].activate();
}

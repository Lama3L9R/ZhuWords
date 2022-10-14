import { Layout, setLayout } from './control/layoutControl';
import { DebugLogger } from './DebugLogger';
import { h } from './hs';
import { forceReflow } from './util/DOM';

export enum ItemDecoration {
  SELECTABLE,
  BACK,
  ICON_FOLDER,
  ICON_LINK,
  ICON_EQUALIZER,
  ICON_FILE,
  ICON_GAME,
  ICON_NOTIFICATION,
  ICON_LIST,
  ICON_CALENDER,
  ICON_HISTORY,
  ICON_CLEAR,
  ICON_PERSON,
  ICON_TAG,
}

export enum ItemLocation {
  BEFORE,
  AFTER,
}

type ItemOptions = {
  location?: ItemLocation,
  hidden?: boolean;
} & ({
  button?: false;
} | {
  button: true;
  link?: string;
  decoration?: ItemDecoration;
});

function createSpan(text: string, ...classNames: Array<string>) {
  const $span = document.createElement('span');
  $span.innerText = text;
  $span.classList.add(...classNames);
  return $span;
}

export class ItemHandle {
  private $prependSpan: HTMLSpanElement | null = null;
  private $appendSpan: HTMLSpanElement | null = null;
  public constructor(
    private menu: Menu,
    public $flexElement: HTMLDivElement,
    public $innerElement: HTMLDivElement | HTMLAnchorElement,
  ) { }
  public setSelected(selected: boolean) {
    this.$innerElement.classList.toggle('selected', selected);
    return this;
  }
  public onClick(handler: (element: ItemHandle) => void) {
    this.$innerElement.addEventListener('click', () => {
      handler(this);
    });
    return this;
  }
  public setInnerText(innerText: string) {
    this.$innerElement.innerText = innerText;
    return this;
  }
  public addClass(className: string) {
    this.$innerElement.classList.add(className);
    return this;
  }
  public removeClass(className: string) {
    this.$innerElement.classList.remove(className);
    return this;
  }
  public prepend(text: string, className?: string) {
    if (this.$prependSpan === null) {
      this.$prependSpan = createSpan('', 'prepend');
      this.$innerElement.prepend(this.$prependSpan);
    }
    const $span = createSpan(text, 'item-side');
    if (className !== undefined) {
      $span.classList.add(className);
    }
    this.$prependSpan.prepend($span);
    return $span;
  }
  public append(text: string, className?: string) {
    if (this.$appendSpan === null) {
      this.$appendSpan = createSpan('', 'append');
      this.$innerElement.appendChild(this.$appendSpan);
    }
    const $span = createSpan(text, 'item-side');
    if (className !== undefined) {
      $span.classList.add(className);
    }
    this.$appendSpan.appendChild($span);
    return $span;
  }
  public remove() {
    this.$flexElement.remove();
  }
}

export class Menu {
  public readonly subMenus: Map<string, {
    name: string,
    factory: () => Menu,
  }> = new Map();
  protected container: HTMLDivElement;
  private debugLogger: DebugLogger;
  public constructor(
    public readonly urlBase: string,
    public readonly layout: Layout = Layout.OFF,
  ) {
    this.debugLogger = new DebugLogger(`Menu (${urlBase})`);
    this.container = h('.menu.hidden');
    document.body.appendChild(this.container);
    // if (this.fullPath.length >= 1) {
    //   const path = document.createElement('div');
    //   path.classList.add('path');
    //   path.innerText = this.fullPath.join(' > ');
    //   this.container.appendChild(path);
    // }
    // if (parent !== null) {
    //   this.addItem('返回', { button: true, decoration: ItemDecoration.BACK, unclearable: true })
    //     .linkTo(parent);
    // }
  }

  public destroy() {
    this.container.classList.add('hidden');
    setTimeout(() => this.container.remove(), 1000);
  }

  public hide() {
    this.container.classList.add('hidden');
  }

  public show() {
    setLayout(this.layout);
    forceReflow(this.container);
    this.container.classList.remove('hidden');
  }

  public addItem(title: string, options: ItemOptions = {}): ItemHandle {
    let $innerElement: HTMLDivElement | HTMLAnchorElement;
    if (options.button && options.link !== undefined) {
      $innerElement = document.createElement('a');
      $innerElement.href = options.link;
      $innerElement.rel = 'noopener noreferrer';
      if (!options.link.startsWith('#')) {
        $innerElement.target = '_blank';
      }
    } else {
      $innerElement = document.createElement('div');
    }
    $innerElement.innerText = title;
    if (options.hidden) {
      $innerElement.classList.add('display-none');
    }
    if (options.button) {
      $innerElement.classList.add('button');
      switch (options.decoration) {
        case ItemDecoration.BACK:
          $innerElement.classList.add('back');
          break;
        case ItemDecoration.SELECTABLE:
          $innerElement.classList.add('selectable');
          break;
        case ItemDecoration.ICON_FOLDER:
          $innerElement.classList.add('icon', 'folder');
          break;
        case ItemDecoration.ICON_LINK:
          $innerElement.classList.add('icon', 'link');
          break;
        case ItemDecoration.ICON_EQUALIZER:
          $innerElement.classList.add('icon', 'equalizer');
          break;
        case ItemDecoration.ICON_FILE:
          $innerElement.classList.add('icon', 'file');
          break;
        case ItemDecoration.ICON_GAME:
          $innerElement.classList.add('icon', 'game');
          break;
        case ItemDecoration.ICON_NOTIFICATION:
          $innerElement.classList.add('icon', 'notification');
          break;
        case ItemDecoration.ICON_LIST:
          $innerElement.classList.add('icon', 'list');
          break;
        case ItemDecoration.ICON_CALENDER:
          $innerElement.classList.add('icon', 'calender');
          break;
        case ItemDecoration.ICON_HISTORY:
          $innerElement.classList.add('icon', 'history');
          break;
        case ItemDecoration.ICON_CLEAR:
          $innerElement.classList.add('icon', 'clear');
          break;
        case ItemDecoration.ICON_PERSON:
          $innerElement.classList.add('icon', 'person');
          break;
        case ItemDecoration.ICON_TAG:
          $innerElement.classList.add('icon', 'icon-tag');
          break;
      }
    }
    const $flexElement = h('.flex') as HTMLDivElement;
    $flexElement.appendChild($innerElement);
    if (options.location === ItemLocation.BEFORE) {
      this.container.prepend($flexElement);
    } else {
      this.container.appendChild($flexElement);
    }

    return new ItemHandle(this, $flexElement, $innerElement);
  }
  protected buildSubMenu<TAdditionalArgs extends Array<unknown>>(
    name: string,
    MenuConstructor: (new (urlBase: string, ...args: TAdditionalArgs) => Menu),
    ...args: TAdditionalArgs
  ) {
    return new SubMenuBuilder(this, name, urlSegment => new MenuConstructor(`${this.urlBase}/${urlSegment}`, ...args));
  }
  public registerSubMenu(name: string, urlSegment: string, menuFactory: () => Menu) {
    if (this.subMenus.has(urlSegment)) {
      this.debugLogger.error(`Duplicated url segment: ${urlSegment}.`);
    }
    this.subMenus.set(urlSegment, {
      name,
      factory: menuFactory,
    });
  }
}

class SubMenuBuilder {
  /** Used in URL */
  private urlSegment: string;
  private displayName: string;
  private decoration: ItemDecoration | undefined = undefined;
  private hidden = false;
  public constructor(
    private readonly parentMenu: Menu,
    /** Displayed in the parent menu */
    private readonly name: string,
    private readonly subMenuFactory: (urlSegment: string) => Menu,
  ) {
    this.urlSegment = name;
    this.displayName = name;
  }
  /**
   * Used for constructing menu url
   */
  public setUrlSegment(urlSegment: string) {
    this.urlSegment = urlSegment;
    return this;
  }
  public setDecoration(decoration: ItemDecoration) {
    this.decoration = decoration;
    return this;
  }
  /**
   * Shown in the menu (initially); Defaults to name
   */
  public setDisplayName(displayName: string) {
    this.displayName = displayName;
    return this;
  }
  public setHidden(hidden: boolean = true) {
    this.hidden = hidden;
    return this;
  }
  public build() {
    this.parentMenu.registerSubMenu(
      this.name,
      this.urlSegment,
      () => this.subMenuFactory(this.urlSegment),
    );
    return this.parentMenu.addItem(this.displayName, {
      button: true,
      link: `${this.parentMenu.urlBase}/${this.urlSegment}`,
      decoration: this.decoration,
      hidden: this.hidden,
    });
  }
}

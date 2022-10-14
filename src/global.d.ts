declare module 'markdown-it-replace-link';
declare module 'markdown-it-ruby';
declare module 'colorworks';
declare module 'unistring';
interface ArrayConstructor {
  isArray(arg: ReadonlyArray<any> | any): arg is ReadonlyArray<any>    
}

type Remap<TElement> = {
  [TKey in keyof TElement]?: TElement[TKey] extends string
    ? (string | Array<string>)
    : TElement[TKey] extends CSSStyleDeclaration
      ? Partial<CSSStyleDeclaration>
      : TElement[TKey];
}

declare namespace JSX {
  type Element = HTMLElement;
  type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: Remap<HTMLElementTagNameMap[K]>;
  } & {
    [K in keyof HTMLElementDeprecatedTagNameMap]: Remap<HTMLElementDeprecatedTagNameMap[K]>;
  }
}

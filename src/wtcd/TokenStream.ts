import { englishConcatenation } from './englishConcatenation';
import { operators } from './operators';
import { WTCDError } from './WTCDError';

/**
 * A stream of discrete items.
 */
abstract class ItemStream<T> {
  /** Whether the first element is read */
  private initCompleted: boolean = false;
  /** Element next #next() or #peek() call will return */
  private current: T | undefined;
  /**
   * Symbol for #readNext() implementation to indicate additional call is
   * required.
   */
  public static readonly RECALL = Symbol('recall');
  /**
   * Read next item. If this read failed to obtain an item, return
   * ItemStream.RECALL will result an additional call.
   * @return asd
   */
  protected abstract readNext(): T | undefined | typeof ItemStream.RECALL;
  /** Callback when next is called but next item does not exist */
  protected abstract onNextCallWhenEOF(): never;
  /** Calls readNext and handles ItemStream.RECALL */
  private readNextWithRecall() {
    this.initCompleted = true;
    let item;
    do {
      item = this.readNext();
    } while (item === ItemStream.RECALL);
    this.current = item;
    return this.current as T | undefined;
  }
  private ensureInitCompleted() {
    if (!this.initCompleted) {
      this.readNextWithRecall();
    }
  }
  public peek(): T | undefined {
    this.ensureInitCompleted();
    return this.current;
  }
  public next(): T {
    this.ensureInitCompleted();
    const item = this.current;
    if (item === undefined) {
      return this.onNextCallWhenEOF();
    }
    this.readNextWithRecall();
    return item;
  }
  public eof() {
    return this.peek() === undefined;
  }
}

/**
 * A steam of characters. Automatically handles inconsistency in line breaks and
 * line/column counting.
 */
class CharStream extends ItemStream<string> {
  public constructor(
    private source: string,
  ) {
    super();
  }
  private pointer: number = -1;
  private line: number = 1;
  private column: number = 0;
  protected readNext() {
    this.pointer++;
    const current = this.source[this.pointer];
    if (current === '\r' || current === '\n') {
      this.line++;
      this.column = 0;
      if (current === '\r' && (this.source[this.pointer + 1] === '\n')) { // Skip \r\n
        this.pointer++;
      }
      return '\n';
    }
    this.column++;
    return current;
  }
  protected onNextCallWhenEOF() {
    return this.throwUnexpectedNext();
  }
  public throw(message: string): never {
    throw WTCDError.atLineColumn(this.line, this.column, message);
  }
  public describeNext(): string {
    switch (this.peek()) {
      case undefined: return '<EOF>';
      case '\t': return '<TAB>';
      case '\n': return '<LF>';
      default: return '"' + this.peek() + '"';
    }
  }
  public throwUnexpectedNext(expecting?: string): never {
    if (expecting === undefined) {
      return this.throw(`Unexpected character ${this.describeNext()}`);
    } else {
      return this.throw(`Unexpected character ${this.describeNext()}, expecting ${expecting}`);
    }
  }
  public getLine(): number {
    return this.line;
  }
  public getColumn(): number {
    return this.column;
  }
  /** Reads next n chars without handling line breaks. */
  public peekNextNChars(n: number): string {
    return this.source.substr(this.pointer, n);
  }
}

function includes(from: string, char: string | undefined) {
  if (char === undefined) {
    return false;
  }
  return from.includes(char);
}

function isNumberPart(char: string | undefined) {
  return includes('0123456789.', char);
}

function isAtNumberStart(charStream: CharStream) {
  return includes('0123456789', charStream.peek()) || (
    (charStream.peek() === '.') &&
    (includes('0123456789', charStream.peekNextNChars(2)[1]))
  );
}

function isSpace(char: string | undefined) {
  return includes(' \t\n', char);
}

function isIdentifierStart(char: string | undefined) {
  return includes('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_', char);
}

function isIdentifierBody(char: string | undefined) {
  return includes('1234567890', char) || isIdentifierStart(char);
}

function isOperatorPart(char: string | undefined) {
  return includes('+-*/^&|=><!?:%~.', char);
}

function isPunctuation(char: string | undefined) {
  return includes('[](){}$', char);
}

function isStringQuote(char: string | undefined) {
  return includes('"\'`', char);
}

function isTagStart(char: string | undefined) {
  return char === '#';
}

function isTagBody(char: string | undefined) {
  return isIdentifierBody(char);
}

function isCommentStarter(str: string) {
  return ['//', '/*'].includes(str);
}

type TokenType = 'identifier' | 'keyword' | 'operator' | 'punctuation' | 'string' | 'number' | 'tag';

interface TokenContent {
  type: TokenType;
  content: string;
}

export type Token = TokenContent & {
  line: number;
  column: number;
};

const keywords = new Set([
  'declare',
  'section',
  'then',
  'goto',
  'null',
  'true',
  'false',
  'number',
  'boolean',
  'string',
  'action',
  'choice',
  'selection',
  'yield',
  'exit',
  'function',
  'return',
  'switch',
  'while',
  'do',
  'continue',
  'break',
  'if',
  'else',
  'list',

  // Reserved
  'for',
  'in',
  'of',
  'enum',
  'dict',
  'dictionary',
  'const',
  'mixed',
]);

const escapeMap = new Map([
  ['n', '\n'],
  ['t', '\t'],
  ['\'', '\''],
  ['"', '"'],
  ['`', '`'],
  ['\\', '\\'],
]);

export class TokenStream extends ItemStream<Token> {
  private charStream: CharStream;
  public constructor(
    source: string,
  ) {
    super();
    this.charStream = new CharStream(source);
  }

  public isNext(type: TokenType, content?: string | Array<string>) {
    const token = this.peek();
    if (token === undefined) {
      return false;
    }
    return (token.type === type) && (content === undefined || (Array.isArray(content)
      ? content.includes(token.content)
      : token.content === content));
  }

  private describeToken(token: Token) {
    return `${token.type} "${token.content}"`;
  }

  public assertNext(type: TokenType, content?: string | Array<string>) {
    if (!this.isNext(type, content)) {
      const expecting = content === undefined
        ? type
        : Array.isArray(content)
          ? `${type} ${englishConcatenation(content.map(item => `"${item}"`))}`
          : `${type} "${content}"`;
      return this.throwUnexpectedNext(expecting);
    }
    return this.peek()!;
  }

  public assertAndSkipNext(type: TokenType, content?: string | Array<string>) {
    this.assertNext(type, content);
    return this.next()!;
  }

  public throwUnexpectedNext(expecting?: string): never {
    const token = this.peek();
    if (token === undefined) {
      throw this.charStream.throwUnexpectedNext(expecting);
    }
    if (expecting === undefined) {
      throw WTCDError.atLineColumn(token.line, token.column, `Unexpected token ${this.describeToken(token)}`);
    } else {
      throw WTCDError.atLineColumn(token.line, token.column, `Unexpected token ${this.describeToken(token)}, expecting ${expecting}`);
    }
  }

  protected onNextCallWhenEOF(): never {
    throw WTCDError.atLineColumn(this.charStream.getLine(), this.charStream.getColumn(), 'Unexpected <EOF>');
  }

  /** Reads from charStream until predicate returns false for next char */
  private readWhile(predicate: (char: string | undefined) => boolean) {
    let result = '';
    while (predicate(this.charStream.peek())) {
      result += this.charStream.next();
    }
    return result;
  }

  /** Assuming next char is a part of an identifier, reads next identifier */
  private readIdentifier() {
    return this.charStream.next() + this.readWhile(isIdentifierBody);
  }

  private readTag() {
    this.charStream.next();
    return this.readWhile(isTagBody); // # <- is ignored
  }

  /** Assuming next char is a part of a number, reads next number */
  private readNumber() {
    let num = this.charStream.next();
    /** Whether dot appeared yet */
    let dot = num === '.';
    while (isNumberPart(this.charStream.peek())) {
      if (this.charStream.peek() === '.') {
        if (dot) {
          return this.charStream.throwUnexpectedNext('number');
        } else {
          dot = true;
        }
      }
      num += this.charStream.next();
    }
    return num;
  }

  /** Assuming next char is a part of an operator, reads next operator */
  private readOperator() {
    return this.charStream.next() + this.readWhile(isOperatorPart);
  }

  /** Assuming next char is a string quote, reads the string */
  private readString() {
    const quote = this.charStream.next();
    let str = '';
    while (this.charStream.peek() !== quote) {
      if (this.charStream.eof()) {
        this.charStream.throwUnexpectedNext(quote);
      }
      if (this.charStream.peek() !== '\\') {
        str += this.charStream.next();
      } else {
        this.charStream.next();
        const escaped = escapeMap.get(this.charStream.peek()!);
        if (escaped === undefined) {
          this.charStream.throw(`Unescapable character ${this.charStream.describeNext()}`);
        }
        str += escaped;
        this.charStream.next();
      }
    }
    this.charStream.next();
    return str;
  }

  /** Assuming next char is a comment starter ("/"), skips the entire comment */
  private skipComment() {
    this.charStream.next(); // Skips /
    if (this.charStream.peek() === '*') { // Block comment
      this.charStream.next(); // Skips *
      while (true) {
        while (this.charStream.peek() !== '*') {
          this.charStream.next();
        }
        this.charStream.next(); // Skips *
        if (this.charStream.next() === '/') { // Skips /
          return;
        }
      }
    } else if (this.charStream.peek() === '/') { // Line comment
      this.charStream.next(); // Skips the second /
      while (this.charStream.peek() !== '\n') {
        this.charStream.next();
      }
      this.charStream.next(); // Skips \n
    } else {
      this.charStream.throw(`Unknown comment type.`);
    }
  }

  protected readNext() {
    while (isSpace(this.charStream.peek())) {
      this.charStream.next();
    }
    if (this.charStream.eof()) {
      return undefined;
    }
    if (isCommentStarter(this.charStream.peekNextNChars(2))) {
      this.skipComment();
      return ItemStream.RECALL;
    }

    const line = this.charStream.getLine();
    const column = this.charStream.getColumn();
    let tokenContent: TokenContent;

    if (isIdentifierStart(this.charStream.peek())) {
      const identifier = this.readIdentifier();
      tokenContent = {
        type: keywords.has(identifier) ? 'keyword' : 'identifier',
        content: identifier,
      };
    } else if (isAtNumberStart(this.charStream)) {
      tokenContent = {
        type: 'number',
        content: this.readNumber(),
      };
    } else if (isOperatorPart(this.charStream.peek())) {
      tokenContent = {
        type: 'operator',
        content: this.readOperator(),
      };
      if (!operators.has(tokenContent.content)) {
        throw WTCDError.atLineColumn(line, column, `Unknown operator: "${tokenContent.content}"`);
      }
    } else if (isPunctuation(this.charStream.peek())) {
      tokenContent = {
        type: 'punctuation',
        content: this.charStream.next(),
      };
    } else if (isStringQuote(this.charStream.peek())) {
      tokenContent = {
        type: 'string',
        content: this.readString(),
      };
    } else if (isTagStart(this.charStream.peek())) {
      tokenContent = {
        type: 'tag',
        content: this.readTag(),
      };
    } else {
      return this.charStream.throwUnexpectedNext();
    }

    return {
      line,
      column,
      ...tokenContent,
    };
  }
}

export type DisplayIndex = Array<number>;

export interface NodeBase {
  type: NodeType;
  displayName: string;
  displayIndex: DisplayIndex;
  sourceRelativePath: string;
  htmlRelativePath: string;
  charsCount: number | null;
}

export type NodeType =
  | 'folder'   // Folder
  | 'Markdown' // Markdown based static chapter
  | 'WTCD';    // WTCD based interactive chapter

export interface ChapterFlagsMapped {
  isEarlyAccess?: true;
  hidden?: true;
  abandoned?: true;
}

export type ChapterFlags = keyof ChapterFlagsMapped;

export interface AuthorRole {
  name: string;
  role: string;
}

export interface ChapterBase extends NodeBase, ChapterFlagsMapped {
  creationTime: number;
  authors: Array<AuthorRole>;
  tags?: Array<string>;
}

export interface MarkdownChapter extends ChapterBase {
  type: 'Markdown';
}

export type WTCDReader =
  | 'flow'
  | 'game';

export interface WTCDChapterBase extends ChapterBase {
  type: 'WTCD';
  preferredReader: WTCDReader;
}

export interface WTCDChapterFlow extends WTCDChapterBase {
  preferredReader: 'flow';
}

export interface WTCDChapterGame extends WTCDChapterBase {
  preferredReader: 'game';
  slideAnimation: boolean;
}

export type WTCDChapter = WTCDChapterFlow | WTCDChapterGame;

export type Chapter = MarkdownChapter | WTCDChapter;

export interface FolderMeta {
  showIndex?: boolean;
}

export interface Folder extends NodeBase, FolderMeta {
  type: 'folder';
  children: Array<Node>;
}

export type Node = Folder | Chapter;

export interface AuthorInfo {
  name: string;
  avatar: string;
  description?: string;
}

export interface Data {
  chapterTree: Folder;
  charsCount: number | null;
  paragraphsCount: number;
  keywordsCount: Array<[string, number]>;
  buildNumber: string;
  authorsInfo: Array<AuthorInfo>;
  buildError: boolean;
  tags: Array<[tag: string, variants: Array<string> | null]>;
  tagAliases: Array<[alias: string, tag: string]>;
}

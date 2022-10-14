export type TagSpecDescLineSegment = {
  type: 'text',
  content: string,
} | {
  type: 'reference',
  tag: string,
};

interface TagSpecDescLine {
  isPrerequisite: boolean;
  segments: Array<TagSpecDescLineSegment>;
}

export interface TagSpec {
  tag: string;
  variants: Array<string> | null;
  priority: number;
  desc: Array<TagSpecDescLine>;
  aliases: Array<string>;
}

export type TagsSpec = Array<TagSpec>;

export type Tag = string;
export type TagInfo = {
  tag: Tag,
  definition: string,
  details?: Array<string>,
  prerequisite: Array<Tag | [Tag, string]>,
};

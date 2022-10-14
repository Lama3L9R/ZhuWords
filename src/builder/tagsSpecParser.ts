import { readFile } from 'fs-extra';
import { TagSpec, TagSpecDescLineSegment, TagsSpec } from '../TagsSpec';
import { tagsSpec } from './dirs';

function parseTagsSpec(content: string): TagsSpec {
  // Replace all line breaks with \n
  content = content.replace(/\r\n|\r|\n/g, '\n');

  // Extract all tags
  // Group 1: tag
  // Group 2: variants
  // Group 3: exclamation marks
  // Group 4: desc block
  return Array.from(content.matchAll(/([^\n]+?)(?:（([^\n]+?)）)?(！*)\n((?:[^\n]+\n)*)/g))
    .map(tagMatch => {
      const tag = tagMatch[1];
      const variants = (tagMatch[2] === undefined) ? null : tagMatch[2].split('/');
      const priority = tagMatch[3].length;
      const aliases: Array<string> = [];
      const desc = tagMatch[4]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .map(line => {
          let isPrerequisite = false;
          if (line.startsWith('+')) {
            isPrerequisite = true;
            line = line.substr(1);
          }
          if (line.startsWith('=')) {
            aliases.push(...line.substr(1).split('，'));
            return {
              isPrerequisite: false,
              segments: [{
                type: 'text' as 'text',
                content: `同义词：${line.substr(1)}`,
              }],
            };
          }
          // Group 1: text
          // Group 2: reference
          const segments: Array<TagSpecDescLineSegment> = Array.from(line.matchAll(/([^【]+)|【(.+?)】/g))
            .map(segmentMatch => {
              if (segmentMatch[1] !== undefined) {
                // text
                return {
                  type: 'text',
                  content: segmentMatch[1],
                };
              } else {
                return {
                  type: 'reference',
                  tag: segmentMatch[2],
                };
              }
            });
          return {
            isPrerequisite,
            segments,
          };
        });
      return {
        variants,
        tag,
        priority,
        desc,
        aliases,
      };
    });
}

export async function loadTagsSpec() {
  const content = await readFile(tagsSpec, 'utf8');
  return parseTagsSpec(content);
}

export function validateAndBuildTagMap(tagsSpec: TagsSpec) {
  const tagAliasMap = new Map<string, string>();
  const tagsMap = new Map<string, TagSpec>();
  tagsSpec.forEach(tagSpec => {
    if (tagsMap.has(tagSpec.tag)) {
      throw new Error(`Duplicated tag specification for tag "${tagSpec.tag}".`);
    }
    tagsMap.set(tagSpec.tag, tagSpec);
  });
  // Reference check
  tagsSpec.forEach(tagSpec => {
    tagSpec.desc.forEach(descLine => {
      descLine.segments.forEach(segment => {
        if (segment.type === 'reference') {
          if (!tagsMap.has(segment.tag)) {
            throw new Error(`Invalid tag reference to "${segment.tag}" from tag "${tagSpec.tag}".`);
          }
          const referencedTag = tagsMap.get(segment.tag)!;
          if (descLine.isPrerequisite && tagSpec.variants !== null && referencedTag.variants !== null) {
            // This tag and its prerequisite has variants.
            for (const variant of tagSpec.variants) {
              if (!referencedTag.variants.includes(variant)) {
                throw new Error(`Tag "${tagSpec.tag}"'s prerequisite "${referencedTag.tag}" lacks variant "${variant}".`);
              }
            }
          }
        }
      });
    });
    tagSpec.aliases.forEach(alias => {
      if (/\s/.test(alias)) {
        throw new Error(`Tag "${tagSpec.tag}" has invalid alias "${alias}".`);
      }
      if (tagAliasMap.has(alias)) {
        throw new Error(`Tag "${tagSpec.tag}" tries to define alias "${alias}", but the same alias was already defined by tag "${tagAliasMap.get(alias)}".`);
      }
      tagAliasMap.set(alias, tagSpec.tag);
    });
  });
  return { tagAliasMap, tagsMap };
}

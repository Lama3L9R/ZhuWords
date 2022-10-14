export function parseTagSpecifier(tagSpecifier: string, tagVariantValidator: (tag: string) => boolean): Array<string> {
  const tagVariants = tagSpecifier.split('，');
  for (const tagVariant of tagVariants) {
    if (!tagVariantValidator(tagVariant)) {
      throw new Error(`Invalid tag: "${tagVariant}".`);
    }
  }
  return tagVariants;
}

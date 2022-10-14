import { AuthorRole } from '../../Data';

export function parseAuthorSpecifier(specifier: string): Array<AuthorRole> {
  return [...specifier.matchAll(/(?<=，|^)(.+?)(?:（(.+?)）)?(?=$|，)/g)]
    .map(match => ({ name: match[1], role: match[2] ?? '作者' }));
}

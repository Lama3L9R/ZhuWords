export function formatRelativePath(relativePath: string) {
  if (relativePath.endsWith('.html')) {
    relativePath = relativePath.substr(0, relativePath.length - '.html'.length);
  }
  relativePath = relativePath.replace(/\//g, ' > ');

  relativePath = relativePath.replace(/-/g, ' ');
  return relativePath;
}

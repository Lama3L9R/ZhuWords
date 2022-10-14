const resourceExtensions = ['.pdf', '.svg'];
export function isResource(path: string) {
  return resourceExtensions.some(extension => path.endsWith(extension));
}

const compressibleImageExtensions = ['.png', '.jpg'];
export function isCompressibleImage(path: string) {
  return compressibleImageExtensions.some(extension => path.endsWith(extension));
}

const documentExtensions = ['html'];
export function isDocument(path: string) {
  return documentExtensions.some(extension => path.endsWith(extension));
}

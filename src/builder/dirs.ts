import { resolve } from 'path';
export const rootDir = resolve(__dirname, '../..');
export const staticDir = resolve(rootDir, 'static');
export const chaptersDir = resolve(rootDir, 'chapters');
export const distDir = resolve(rootDir, 'dist');
export const distLiteDir = resolve(rootDir, 'dist', 'lite');
export const distChaptersDir = resolve(distDir, 'chapters');
export const templatesDir = resolve(rootDir, 'templates');
export const tagsSpec = resolve(rootDir, 'TagsSpec.txt');

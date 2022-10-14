import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { templatesDir } from './builder/dirs';
import { mirrorSites } from './web/constant/mirrorSites';
// import { thanks } from './web/constant/thanks';
import { padName } from './web/util/padName';

let content = readFileSync(join(templatesDir, 'readmeTemplate.md'), 'utf8');

content = content.replace(
  '<placeholder-mirror-list/>',
  mirrorSites.map(({ origin, name, provider }, index) => `- [镜像站 ${index + 1} | ${origin.startsWith('http://') ? '**未加密** | ' : ''}${name}（感谢${padName(provider)}提供）](${origin})`).join('\n')
);

// content = content.replace(
//   '<placeholder-acknowledgements/>',
//   thanks.map(({ name, link }) => (link === undefined)
//     ? `- ${name}`
//     : `- [${name}](${link})`
//   ).join('\n'),
// );

writeFileSync(join(__dirname, '..', 'Readme.md'), content, 'utf8');

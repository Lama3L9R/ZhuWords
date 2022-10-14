#!/usr/bin/env node

const glob = require('glob');
const fs = require('fs');

const obfuscateExtension = '.obfs';

function showSyntaxAndExit() {
  console.info(`Syntax: wtobfs <o[bfuscate]|d[eobfuscate]> <files> [...other files]`);
  process.exit(1);
}

function involute(buffer) {
  let mask = 233;
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] ^= mask;
    mask = (mask * 29) % 256;
  }
}

const startTime = Date.now();

if (process.argv.length < 3) {
  showSyntaxAndExit();
}

const modeSpecifier = process.argv[2];
let obfuscateMode;

if ('obfuscate'.startsWith(modeSpecifier)) {
  obfuscateMode = true;
} else if ('deobfuscate'.startsWith(modeSpecifier)) {
  obfuscateMode = false;
} else {
  showSyntaxAndExit();
}

const files = process.argv.slice(3).flatMap(pattern => glob.sync(pattern, {
  nodir: true,
})).filter(path => path.endsWith(obfuscateExtension) ^ obfuscateMode);

if (files.length === 0) {
  console.info(`No ${obfuscateMode ? 'unobfuscated' : 'obfuscated'} file matched pattern${process.argv.length > 3 ? 's' : ''}: ${process.argv.slice(3).map(pattern => `"${pattern}"`).join(', ')}.`);
  process.exit(2);
}

console.info(`Found ${files.length} matching file${files.length !== 1 ? 's' : ''}.`);

const sequenceDigits = Math.floor(Math.log10(files.length)) + 1;
for (let i = 0; i < files.length; i++) {
  const filePath = files[i];
  console.info(`[${String(i + 1).padStart(sequenceDigits, ' ')}/${files.length}] ${obfuscateMode ? 'Obfuscating' : 'Deobfuscating'} ${filePath}.`);
  const fileContent = fs.readFileSync(filePath);
  involute(fileContent);
  fs.writeFileSync(
    obfuscateMode
      ? (filePath + obfuscateExtension)
      : filePath.substr(0, filePath.length - obfuscateExtension.length),
    fileContent,
  );
}

console.info(`Successfully ${obfuscateMode ? 'obfuscated' : 'deobfuscated'} ${files.length} file${files.length !== 1 ? 's' : ''} in ${Date.now() - startTime}ms.`);

import * as fs from 'fs';
import { log } from './indentConsole';

const patches: Array<{file: string, patcher: (file: fs.PathLike) => void}> = [
    { file: "markdown-it-mathjax3/index.d.ts", patcher: mathjax3Patch }
]

const PatchTools = {
    replaceAll: (file: fs.PathLike, content: string) => {
        fs.rmSync(file)
        const handle = fs.openSync(file, 'w', 0o666);
        fs.writeSync(handle, content)
        fs.closeSync(handle)
    }
    // TODO: byDifference(Array<Difference>)  (99.99% 用不到)
        // constructor Difference(line: number, type: "deletion | addition" | modification", begin: number, contents: string | Array<string>)
        // constructor Difference(lineBegin: number, lineEnd: number, type: ..., begin: number, end: number, contents: string | Array<string>)
    // TODO: replaceLine   (99.99% 用不到)
    // TODO: injectLine    (99.99% 用不到)

}

export function applyPatches(projectRoot: fs.PathLike) {
    log(fs.realpathSync(projectRoot + "node_modules/"))
    for (const patch of patches) {
        patch.patcher(projectRoot + "node_modules/" + patch.file)
    }
}

// Patches

function mathjax3Patch(file: fs.PathLike) {
    const fixedTypeDefFile =
`
import type * as MarkdownIt from "markdown-it";
declare function plugin(md: MarkdownIt, options: any): void;
declare namespace plugin {
    var _a: typeof plugin;
    export { _a as default };
}
export = plugin;

`.trim()
    PatchTools.replaceAll(file, fixedTypeDefFile)
}
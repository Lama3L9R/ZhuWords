import { NativeFunction } from '../types';
import { getMaybePooled } from '../constantsPool';
import { assertArgsLength, assertArgType, NativeFunctionError } from './utils';
import { ChainedCanvas } from '../ChainedCanvas';
import { InterpreterHandle } from '../Interpreter';

function obtainCanvas(interpreterHandle: InterpreterHandle, id: string) {
  const canvas = interpreterHandle.canvases.get(id)!;
  if (canvas === undefined) {
    throw new NativeFunctionError(`Canvas with id="${id}" does not exist.`);
  }
  return canvas;
}

function assertIsHAlign(hAlign: string): asserts hAlign is CanvasTextAlign {
  switch (hAlign) {
    case 'left':
    case 'center':
    case 'right':
    case 'start':
    case 'end':
      break;
    default:
      throw new NativeFunctionError(`Unknown text hAlign: ${hAlign}`);
  }
}

function assertIsVAlign(vAlign: string): asserts vAlign is CanvasTextBaseline {
  switch (vAlign) {
    case 'top':
    case 'hanging':
    case 'middle':
    case 'alphabetic':
    case 'ideographic':
    case 'bottom':
      break;
    default:
      throw new NativeFunctionError(`Unknown text vAlign: ${vAlign}`);
  }
}

export const canvasStdFunctions: Array<NativeFunction> = [
  function canvasCreate(args, interpreterHandle) {
    assertArgsLength(args, 3);
    const id = assertArgType(args, 0, 'string');
    const width = assertArgType(args, 1, 'number');
    const height = assertArgType(args, 2, 'number');
    if (interpreterHandle.canvases.has(id)) {
      throw new NativeFunctionError(`Canvas with id="${id}" already exists`);
    }
    if (width % 1 !== 0) {
      throw new NativeFunctionError(`Width (${width}) has to be an integer`);
    }
    if (width <= 0) {
      throw new NativeFunctionError(`Width (${width}) must be positive`);
    }
    if (height % 1 !== 0) {
      throw new NativeFunctionError(`Height (${height}) has to be an integer`);
    }
    if (height <= 0) {
      throw new NativeFunctionError(`Height (${height}) must be positive`);
    }
    interpreterHandle.canvases.set(id, new ChainedCanvas(width, height));
    return getMaybePooled('null', null);
  },
  function canvasOutput(args, interpreterHandle) {
    const id = assertArgType(args, 0, 'string');
    const canvas = obtainCanvas(interpreterHandle, id);
    const $newCanvas = document.createElement('canvas');
    $newCanvas.width = canvas.getWidth();
    $newCanvas.height = canvas.getHeight();
    $newCanvas.style.maxWidth = '100%';
    interpreterHandle.featureProvider.drawLoadingCanvas($newCanvas);
    interpreterHandle.pushContent($newCanvas);
    canvas.onResolve(() => {
      if (document.body.contains($newCanvas)) {
        const ctx = $newCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, $newCanvas.width, $newCanvas.height);
        ctx.drawImage(canvas.canvas, 0, 0);
      }
    });
    return getMaybePooled('null', null);
  },
  function canvasClear(args, interpreterHandle) {
    const id = assertArgType(args, 0, 'string');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      canvas.ctx.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
    });
    return getMaybePooled('null', null);
  },
  function canvasPutImage(args, interpreterHandle) {
    assertArgsLength(args, 4, 6);
    const id = assertArgType(args, 0, 'string');
    const path = assertArgType(args, 1, 'string');
    const x = assertArgType(args, 2, 'number');
    const y = assertArgType(args, 3, 'number');
    const width = assertArgType(args, 4, 'number', -1);
    const height = assertArgType(args, 5, 'number', -1);
    if ((width < 0) !== (height < 0)) {
      throw new NativeFunctionError('Width and height must be provided at ' +
        'the same time.');
    }
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      try {
        const image = await interpreterHandle.featureProvider.loadImage(path);
        if (width < 0) {
          canvas.ctx.drawImage(image, x, y);
        } else {
          canvas.ctx.drawImage(image, x, y, width, height);
        }
      } catch (error) {
        console.error(`WTCD failed to load image with path="${path}".`, error);
      }
    });
    return getMaybePooled('null', null);
  },
  function canvasPutImagePart(args, interpreterHandle) {
    assertArgsLength(args, 8, 10);
    const id = assertArgType(args, 0, 'string');
    const path = assertArgType(args, 1, 'string');
    const sourceX = assertArgType(args, 2, 'number');
    const sourceY = assertArgType(args, 3, 'number');
    const sourceWidth = assertArgType(args, 4, 'number');
    const sourceHeight = assertArgType(args, 5, 'number');
    const destX = assertArgType(args, 6, 'number');
    const destY = assertArgType(args, 7, 'number');
    const destWidth = assertArgType(args, 8, 'number', -1);
    const destHeight = assertArgType(args, 9, 'number', -1);
    if ((destWidth < 0) !== (destHeight < 0)) {
      throw new NativeFunctionError('destWidth and destHeight must be ' +
        'provided at the same time.');
    }
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      try {
        const image = await interpreterHandle.featureProvider.loadImage(path);
        if (destWidth < 0) {
          canvas.ctx.drawImage(
            image,
            sourceX, sourceY,
            sourceWidth, sourceHeight,
            destX, destY,
            sourceWidth, sourceHeight
          );
        } else {
          canvas.ctx.drawImage(
            image,
            sourceX, sourceY,
            sourceWidth, sourceHeight,
            destX, destY,
            destWidth, destHeight
          );
        }
      } catch (error) {
        console.error(`WTCD failed to load image with path="${path}".`, error);
      }
    });
    return getMaybePooled('null', null);
  },
  function canvasSetFont(args, interpreterHandle) {
    assertArgsLength(args, 3);
    const id = assertArgType(args, 0, 'string');
    const size = assertArgType(args, 1, 'number');
    const fontIdentifier = assertArgType(args, 2, 'string');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      try {
        const fontName = await interpreterHandle.featureProvider
          .loadFont(fontIdentifier);
        canvas.ctx.font = `${size}px ${fontName}`;
      } catch (error) {
        console.error(`WTCD failed to load font with ` +
          `identifier="${fontIdentifier}".`, error);
      }
    });
    return getMaybePooled('null', null);
  },
  function canvasSetFillStyle(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const id = assertArgType(args, 0, 'string');
    const color = assertArgType(args, 1, 'string');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      canvas.ctx.fillStyle = color;
    });
    return getMaybePooled('null', null);
  },
  function canvasFillText(args, interpreterHandle) {
    assertArgsLength(args, 4, 6);
    const id = assertArgType(args, 0, 'string');
    const text = assertArgType(args, 1, 'string');
    const x = assertArgType(args, 2, 'number');
    const y = assertArgType(args, 3, 'number');
    const hAlign = assertArgType(args, 4, 'string', 'start');
    const vAlign = assertArgType(args, 5, 'string', 'alphabetic');
    const canvas = obtainCanvas(interpreterHandle, id);
    assertIsHAlign(hAlign);
    assertIsVAlign(vAlign);
    canvas.updatePromise(async () => {
      const ctx = canvas.ctx;
      ctx.textAlign = hAlign;
      ctx.textBaseline = vAlign;
      ctx.fillText(text, x, y);
    });
    return getMaybePooled('null', null);
  },
  function canvasFillRect(args, interpreterHandle) {
    assertArgsLength(args, 5);
    const id = assertArgType(args, 0, 'string');
    const x = assertArgType(args, 1, 'number');
    const y = assertArgType(args, 2, 'number');
    const width = assertArgType(args, 3, 'number');
    const height = assertArgType(args, 4, 'number');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      canvas.ctx.fillRect(x, y, width, height);
    });
    return getMaybePooled('null', null);
  },
  function canvasSetStrokeStyle(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const id = assertArgType(args, 0, 'string');
    const color = assertArgType(args, 1, 'string');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      canvas.ctx.strokeStyle = color;
    });
    return getMaybePooled('null', null);
  },
  function canvasSetLineWidth(args, interpreterHandle) {
    assertArgsLength(args, 2);
    const id = assertArgType(args, 0, 'string');
    const lineWidth = assertArgType(args, 1, 'number');
    const canvas = obtainCanvas(interpreterHandle, id);
    canvas.updatePromise(async () => {
      canvas.ctx.lineWidth = lineWidth;
    });
    return getMaybePooled('null', null);
  },
  function canvasStrokeText(args, interpreterHandle) {
    assertArgsLength(args, 4, 6);
    const id = assertArgType(args, 0, 'string');
    const text = assertArgType(args, 1, 'string');
    const x = assertArgType(args, 2, 'number');
    const y = assertArgType(args, 3, 'number');
    const hAlign = assertArgType(args, 4, 'string', 'start');
    const vAlign = assertArgType(args, 5, 'string', 'alphabetic');
    const canvas = obtainCanvas(interpreterHandle, id);
    assertIsHAlign(hAlign);
    assertIsVAlign(vAlign);
    canvas.updatePromise(async () => {
      const ctx = canvas.ctx;
      ctx.textAlign = hAlign;
      ctx.textBaseline = vAlign;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeText(text, x, y);
    });
    return getMaybePooled('null', null);
  },
];

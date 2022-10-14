import {
  WTCD_ERROR_COMPILE_TITLE,
  WTCD_ERROR_INTERNAL_DESC,
  WTCD_ERROR_INTERNAL_STACK_DESC,
  WTCD_ERROR_INTERNAL_STACK_TITLE,
  WTCD_ERROR_INTERNAL_TITLE,
  WTCD_ERROR_MESSAGE,
  WTCD_ERROR_RUNTIME_DESC,
  WTCD_ERROR_RUNTIME_TITLE,
  WTCD_ERROR_WTCD_STACK_DESC,
  WTCD_ERROR_WTCD_STACK_TITLE,
} from '../constant/messages';

import { ErrorType } from './chapterControl';
export function createWTCDErrorMessage({
  errorType,
  message,
  internalStack,
  wtcdStack,
}: {
  errorType: ErrorType;
  message: string;
  internalStack?: string;
  wtcdStack?: string;
}): HTMLDivElement {
  const $target = document.createElement('div');
  const $title = document.createElement('h1');
  const $desc = document.createElement('p');
  switch (errorType) {
    case ErrorType.COMPILE:
      $title.innerText = WTCD_ERROR_COMPILE_TITLE;
      $desc.innerText = WTCD_ERROR_COMPILE_TITLE;
      break;
    case ErrorType.RUNTIME:
      $title.innerText = WTCD_ERROR_RUNTIME_TITLE;
      $desc.innerText = WTCD_ERROR_RUNTIME_DESC;
      break;
    case ErrorType.INTERNAL:
      $title.innerText = WTCD_ERROR_INTERNAL_TITLE;
      $desc.innerText = WTCD_ERROR_INTERNAL_DESC;
      break;
  }
  $target.appendChild($title);
  $target.appendChild($desc);
  const $message = document.createElement('p');
  $message.innerText = WTCD_ERROR_MESSAGE + message;
  $target.appendChild($message);
  if (wtcdStack !== undefined) {
    const $stackTitle = document.createElement('h2');
    $stackTitle.innerText = WTCD_ERROR_WTCD_STACK_TITLE;
    $target.appendChild($stackTitle);
    const $stackDesc = document.createElement('p');
    $stackDesc.innerText = WTCD_ERROR_WTCD_STACK_DESC;
    $target.appendChild($stackDesc);
    const $pre = document.createElement('pre');
    const $code = document.createElement('code');
    $code.innerText = wtcdStack;
    $pre.appendChild($code);
    $target.appendChild($pre);
  }
  if (internalStack !== undefined) {
    const $stackTitle = document.createElement('h2');
    $stackTitle.innerText = WTCD_ERROR_INTERNAL_STACK_TITLE;
    $target.appendChild($stackTitle);
    const $stackDesc = document.createElement('p');
    $stackDesc.innerText = WTCD_ERROR_INTERNAL_STACK_DESC;
    $target.appendChild($stackDesc);
    const $pre = document.createElement('pre');
    const $code = document.createElement('code');
    $code.innerText = internalStack;
    $pre.appendChild($code);
    $target.appendChild($pre);
  }
  return $target;
}

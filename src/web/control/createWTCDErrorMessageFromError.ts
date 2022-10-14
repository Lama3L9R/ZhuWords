import { WTCDError } from '../../wtcd/WTCDError';
import { ErrorType } from './chapterControl';
import { createWTCDErrorMessage } from './createWTCDErrorMessage';
export function createWTCDErrorMessageFromError(error: Error) {
  return createWTCDErrorMessage({
    errorType: (error instanceof WTCDError)
      ? ErrorType.RUNTIME
      : ErrorType.INTERNAL,
    message: error.message,
    internalStack: error.stack,
    wtcdStack: (error instanceof WTCDError)
      ? error.wtcdStack
      : undefined,
  });
}

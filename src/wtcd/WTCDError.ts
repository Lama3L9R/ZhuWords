import { OptionalLocationInfo } from './types';

const empty = {};

export class WTCDError<TLocationInfo extends boolean> extends Error {
  private readonly wtcdStackArray: Array<string> = [];
  private constructor(
    message: string,
    public readonly line: TLocationInfo extends true ? number : null,
    public readonly column: TLocationInfo extends true ? number : null,
  ) {
    super(message);
    this.name = 'WTCDError';
  }
  public get wtcdStack() {
    return this.message + '\n' + this.wtcdStackArray.join('\n');
  }
  public pushWTCDStack(info: string, location: OptionalLocationInfo = empty) {
    this.wtcdStackArray.push(`    at ${info}`
      + (location.line
        ? ':' + location.line
          + (location.column
            ? ':' + location.column
            : '')
        : ''),
    );
  }
  public static atUnknown(message: string) {
    return new WTCDError<false>(message + ` at unknown location. (Location `
      + `info is not available for this type of error)`, null, null);
  }
  public static atLineColumn(line: number, column: number, message: string) {
    return new WTCDError<true>(
      message + ` at ${line}:${column}.`,
      line,
      column,
    );
  }
  public static atLocation(
    location: OptionalLocationInfo | null,
    message: string,
  ) {
    if (location === null) {
      return WTCDError.atUnknown(message);
    }
    if (location.line === undefined) {
      return new WTCDError(message + ' at unknown location. (Try recompile in '
        + 'debug mode to enable source map)', null, null);
    } else {
      return WTCDError.atLineColumn(location.line, location.column!, message);
    }
  }
}

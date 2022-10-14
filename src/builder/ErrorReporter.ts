import { log } from './indentConsole';

export interface ReportableError {
  print(): void;
}

class SimpleReportableError implements ReportableError {
  public constructor(
    private message: string,
    private error: Error,
  ) {}
  public print(): void {
    log(`[[red|${this.message}]]`);
    console.info(this.error);
  }
}

export class ErrorReporter {
  private errors: Array<ReportableError> = [];
  public printAll() {
    this.errors.forEach((error, index) => {
      log(`[[bgRed|[[white|Error ${index + 1}/${this.errors.length}]]]]`);
      error.print();
      log();
    });
  }
  public reportError(error: ReportableError) {
    this.errors.push(error as ReportableError);
  }
  public wrapAndReportError(message: string, error: Error) {
    this.reportError(new SimpleReportableError(message, error));
  }
  public hasError() {
    return this.errors.length >= 1;
  }
}

import { ContentOutput, Interpreter } from './Interpreter';
import { Random } from './Random';
import { WTCDRoot } from './types';
import { FeatureProvider, defaultFeatureProvider } from './FeatureProvider';

interface GameData {
  random: string;
  decisions: Array<number>;
}
function isGameData(data: any): data is GameData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  if (typeof data.random !== 'string') {
    return false;
  }
  if (!Array.isArray(data.decisions)) {
    return false;
  }
  if (data.decisions.some((decision: any) => typeof decision !== 'number')) {
    return false;
  }
  return true;
}
interface SaveData extends GameData {
  date: number;
  desc: string;
}
function isSaveData(data: any): data is SaveData {
  if (!isGameData(data)) {
    return false;
  }
  if (typeof (data as any).date !== 'number') {
    return false;
  }
  if (typeof (data as any).desc !== 'string') {
    return false;
  }
  return true;
}
interface Data {
  saves: Array<SaveData | null>;
  current: GameData;
}
function isData(data: any): data is Data {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  if (!isGameData(data.current)) {
    return false;
  }
  if (!Array.isArray(data.saves)) {
    return false;
  }
  if (!data.saves.every((save: any) => save === null || isSaveData(save))) {
    return false;
  }
  return true;
}

/**
 * This is one of the possible implementations of a WTCD reader.
 *
 * This is a reader specialized for games. This reader only display one section
 * at a time. This reader also does not allow undo.
 *
 * However, this reader does support save/load. It persists data via memorizing
 * all decisions too.
 */
export class GameReader {
  private storageKey: string;
  private data: Data;
  /** The interpreter */
  private interpreter!: Interpreter;
  /** The iterator of the interpreter */
  private interpreterIterator!: Iterator<ContentOutput, ContentOutput, number>;
  public constructor(
    docIdentifier: string,
    private wtcdRoot: WTCDRoot,
    private onOutput: (content: HTMLDivElement) => void,
    private onError: (error: Error) => void,
    private featureProvider: FeatureProvider = defaultFeatureProvider,
  ) {
    this.storageKey = `wtcd.gr.${docIdentifier}`;
    this.data = this.parseData(
      window.localStorage.getItem(this.storageKey),
    ) || {
      saves: [null, null, null],
      current: {
        random: String(Math.random()),
        decisions: [],
      },
    };
  }
  private parseData(data: any): Data | null {
    if (typeof data !== 'string') {
      return null;
    }
    let obj: any;
    try {
      obj = JSON.parse(data);
    } catch (error) {
      return null;
    }
    if (!isData(obj)) {
      return null;
    }
    return obj;
  }
  private persist() {
    window.localStorage.setItem(this.storageKey, JSON.stringify(this. data));
  }
  public getSaves() {
    return this.data.saves.map(save => save === null
      ? null
      : {
        desc: save.desc,
        date: new Date(save.date),
      },
    );
  }
  public reset(reseed: boolean) {
    this.data.current.decisions = [];
    if (reseed) {
      this.data.current.random = String(Math.random());
    }
    this.restoreGameState();
    this.persist();
  }
  public save(saveIndex: number) {
    const save = this.data.saves[saveIndex];
    if (save === undefined) {
      throw new Error(`Illegal save index: ${saveIndex}`);
    }
    this.data.saves[saveIndex] = {
      date: Date.now(),
      desc: this.interpreter.getStateDesc() || '',
      random: this.data.current.random,
      decisions: this.data.current.decisions.slice(),
    };
    if (this.data.saves[this.data.saves.length - 1] !== null) {
      this.data.saves.push(null);
    }
    this.persist();
  }
  public load(saveIndex: number) {
    const save = this.data.saves[saveIndex];
    if (save === undefined || save === null) {
      throw new Error(`Illegal save index: ${saveIndex}.`);
    }
    this.data.current.random = save.random;
    this.data.current.decisions = save.decisions.slice();
    this.restoreGameState();
    this.persist();
  }
  /** Calls this.interpreterIterator.next() and handles error. */
  private next(
    decision?: number,
  ): IteratorResult<ContentOutput, ContentOutput> {
    try {
      return this.interpreterIterator.next(decision as any);
    } catch (error) {
      this.onError(error as Error);
      return {
        done: true,
        value: {
          choices: [],
          content: [],
        },
      };
    }
  }
  private restoreGameState() {
    this.interpreter = new Interpreter(
      this.wtcdRoot,
      new Random(this.data.current.random),
      this.featureProvider,
    );
    this.interpreterIterator = this.interpreter.start();
    let lastOutput = this.next();
    this.data.current.decisions.forEach(decision =>
      lastOutput = this.next(decision),
    );
    this.handleOutput(lastOutput.value);
  }
  private handleOutput(output: ContentOutput) {
    const $output = document.createElement('div');
    output.content.forEach($element => $output.appendChild($element));
    this.interpreter.getPinned()
      .forEach($element => $output.appendChild($element));
    const decisionIndex = this.data.current.decisions.length;
    const buttons = output.choices.map((choice, choiceIndex) => {
      const $button = document.createElement('div');
      $button.classList.add('wtcd-button');
      $button.innerText = choice.content;
      if (choice.disabled) {
        $button.classList.add('disabled');
      } else {
        $button.classList.add('candidate');
        $button.addEventListener('click', () => {
          if (decisionIndex !== this.data.current.decisions.length) {
            return;
          }
          this.data.current.decisions.push(choiceIndex);
          buttons.forEach($eachButton => {
            if ($eachButton === $button) {
              $eachButton.classList.add('selected');
            } else {
              $eachButton.classList.add('unselected');
            }
          });
          this.handleOutput(this.next(choiceIndex).value);
          this.persist();
        });
      }
      $output.appendChild($button);
      return $button;
    });
    this.onOutput($output);
  }
  private started = false;
  public start() {
    if (this.started) {
      throw new Error('Game reader already started.');
    }
    this.started = true;
    this.restoreGameState();
  }
}

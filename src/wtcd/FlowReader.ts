import { ContentOutput, Interpreter } from './Interpreter';
import { Random } from './Random';
import { WTCDRoot } from './types';
import { FeatureProvider, defaultFeatureProvider } from './FeatureProvider';

/** Data persisted in the localStorage */
interface Data {
  random: string;
  decisions: Array<number>;
}

/**
 * This is one of the possible implementations of a WTCD reader.
 *
 * In this implementation, all new content and buttons are appended to a single
 * HTML element. The user is expected to continuously scroll down the page in
 * order to read more, thus the name "flow reader".
 *
 * This reader implementation persists data via memorizing all users' decisions.
 * When restoring a previous session, it replays all decisions.
 *
 * Since all decisions are recorded, this implementation allows the user to undo
 * decisions, in which case, it resets the interpreter and replay all decisions
 * until the decision that is being undone. This means, however, if the logic of
 * WTCD section is extremely complicated and takes a long time to compute, it
 * will potentially lag user's interface every time the user undoes a decision.
 */
export class FlowReader {
  /** The interpreter */
  private interpreter!: Interpreter;
  /** The iterator of the interpreter */
  private interpreterIterator!: Iterator<ContentOutput, ContentOutput, number>;
  /** Key in local storage */
  private storageKey: string;
  /** Persisted data */
  private data: Data;
  /** Where to render the output */
  private target!: HTMLElement;
  /** Which decision the current buttons are for */
  private currentDecisionIndex: number = 0;
  /** Buttons for each group of output */
  private buttons: Array<Array<HTMLDivElement>> = [];
  /** Content output after each decision */
  private contents: Array<HTMLElement> = [];
  /**
   * Verify and parse data stored in localStorage.
   */
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
    if (typeof obj.random !== 'string') {
      return null;
    }
    if (!Array.isArray(obj.decisions)) {
      return null;
    }
    if (obj.decisions.some((decision: any) => typeof decision !== 'number')) {
      return null;
    }
    return obj;
  }
  /** Fancy name for "save" */
  private persist() {
    window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }
  /**
   * Calls this.interpreterIterator.next() and handles error.
   */
  private next(decision?: number): IteratorResult<ContentOutput, ContentOutput> {
    try {
      return this.interpreterIterator.next(decision as any);
    } catch (error) {
      const $errorMessage = this.errorMessageCreator(error as Error);
      this.target.appendChild($errorMessage);
      this.contents.push($errorMessage);
      return {
        done: true,
        value: {
          choices: [],
          content: [],
        },
      };
    }
  }
  /** Restart the interpreter and reset the interpreterIterator */
  public resetInterpreter() {
    this.interpreter = new Interpreter(
      this.wtcdRoot,
      new Random(this.data.random),
      this.featureProvider,
    );
    this.interpreterIterator = this.interpreter.start();
  }
  public constructor(
    docIdentifier: string,
    private wtcdRoot: WTCDRoot,
    private errorMessageCreator: (error: Error) => HTMLElement,
    private elementPreprocessor: ($element: HTMLElement) => void,
    private featureProvider: FeatureProvider = defaultFeatureProvider,
  ) {
    this.storageKey = `wtcd.fr.${docIdentifier}`;
    this.data = this.parseData(window.localStorage.getItem(this.storageKey)) || {
      random: String(Math.random()),
      decisions: [],
    };
    this.resetInterpreter();
  }

  /**
   * Make a decision at currentDecisionIndex and update buttons accordingly
   *
   * @param decision the index of choice to be made
   * @param replay whether this is during a replay; If true, the decision will
   * not be added to data.
   */
  private decide(decision: number, replay: boolean = false) {
    this.buttons[this.currentDecisionIndex].forEach(($button, choiceIndex) => {
      if ($button.classList.contains('disabled')) {
        return;
      }
      $button.classList.remove('candidate');
      if (choiceIndex === decision) {
        $button.classList.add('selected');
      } else {
        $button.classList.add('unselected');
      }
    });
    if (!replay) {
      this.data.decisions.push(decision);
    }
    // Advance current decision index
    this.currentDecisionIndex++;
    const yieldValue = this.next(decision);
    this.handleOutput(yieldValue.value);
    return yieldValue.done;
  }

  /**
   * Undo a decision made previously; It also removes every decision after the
   * specified decision.
   *
   * @param decisionIndex which decision to be undone
   */
  private undecide(decisionIndex: number) {
    this.resetInterpreter();

    // Clear those no longer needed content
    this.data.decisions.splice(decisionIndex);
    this.buttons.splice(decisionIndex + 1);
    this.contents.splice(decisionIndex + 1)
      .forEach($deletedContent => $deletedContent.remove());

    // Replay
    this.next();
    for (const decision of this.data.decisions) {
      this.next(decision);
    }

    // Update current decision's buttons so they become available to click
    // again.
    this.buttons[decisionIndex].forEach($button => {
      if (!$button.classList.contains('disabled')) {
        $button.classList.remove('selected', 'unselected');
        $button.classList.add('candidate');
      }
    });

    this.currentDecisionIndex = decisionIndex;
  }

  /**
   * Handle an instance of output from the interpreter. This will add the
   * content output and buttons to target.
   *
   * @param output the content output to be added
   */
  private handleOutput(output: ContentOutput) {
    // Create a container for all elements involved so deletion will be easier.
    const $container = document.createElement('div');
    $container.classList.add('wtcd-group-container');
    output.content.forEach($element => $container.appendChild($element));
    this.interpreter.getPinned().forEach($element =>
      $container.appendChild($element),
    );
    const decisionIndex = this.currentDecisionIndex;
    this.buttons.push(output.choices.map((choice, choiceIndex) => {
      const $button = document.createElement('div');
      $button.classList.add('wtcd-button');
      $button.innerText = choice.content;
      if (choice.disabled) {
        $button.classList.add('disabled');
      } else {
        $button.classList.add('candidate');
        $button.addEventListener('click', () => {
          if (this.data.decisions[decisionIndex] === choiceIndex) {
            this.undecide(decisionIndex);
            this.persist();
          } else if (this.currentDecisionIndex === decisionIndex) {
            this.decide(choiceIndex);
            this.persist();
          }
        });
      }
      $container.appendChild($button);
      return $button;
    }));

    this.contents.push($container);
    this.target.appendChild($container);
    this.elementPreprocessor($container);
  }

  private started: boolean = false;
  public renderTo($target: HTMLElement) {
    if (this.started) {
      throw new Error('Flow reader already started.');
    }
    this.started = true;
    this.target = $target;

    const init  = this.next();
    let done = init.done;
    this.handleOutput(init.value);
    for (const decision of this.data.decisions) {
      if (done) {
        return;
      }
      done = this.decide(decision, true);
    }
  }
}

import { countCertainWord } from './countCertainWord';
import { countChars } from './countChars';
import { countParagraphs } from './countParagraphs';
import { keywords } from './keywords';

export class Stats {
  private charsCount = 0;
  private paragraphsCount = 0;
  private keywordsCount: Map<string, number> = new Map();
  public constructor(
    private isProduction: boolean,
  ) {
    keywords.forEach(keyword => {
      this.keywordsCount.set(keyword, 0);
    });
  }
  public processMarkdown(markdown: string): number | null {
    keywords.forEach(keyword => {
      const count = countCertainWord(markdown, keyword);
      if (count !== 0) {
        this.keywordsCount.set(keyword, this.keywordsCount.get(keyword)! + count);
      }
    });

    if (this.isProduction) {
      const deltaChars = countChars(markdown);
      this.charsCount += deltaChars;
      return deltaChars;
    } else {
      return null;
    }
  }
  public processHtml(html: string) {
    this.paragraphsCount += countParagraphs(html);
  }
  public getCharsCount() {
    return this.charsCount;
  }
  public getParagraphCount() {
    return this.paragraphsCount;
  }
  public getKeywordsCount() {
    return this.keywordsCount;
  }
}
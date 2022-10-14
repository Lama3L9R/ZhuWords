import { $e } from '../$e';
import { ContentBlock, ContentBlockSide, ContentBlockStyle } from '../control/contentControl';
import { Modal } from '../control/modalControl';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';
import { search, SearchInput } from '../control/searchControl';
import { data, tagAliasMap } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { autoExpandTextArea } from '../util/DOM';
import { formatRelativePath } from '../util/formatRelativePath';
import { tagSpan } from '../util/tag';

function resolveAlias(maybeAliased: string) {
  let modifier: string = '';
  if ('+-'.includes(maybeAliased[0])) {
    modifier = maybeAliased[0];
    maybeAliased = maybeAliased.substr(1);
  }
  const split = maybeAliased.split('（');
  if (tagAliasMap.has(split[0].toLowerCase())) {
    split[0] = tagAliasMap.get(split[0].toLowerCase())!;
  }
  return modifier + split.join('（');
}

export const tagSearch: Page = {
  name: 'tag-search',
  handler: (content, pagePath) => {
    setNavbarPath([{ display: '标签搜索', hash: null }]);
    content.addBlock({
      initElement: (
        <div>
          <h1>绝大多数文章都没有标签！</h1>
          <p>请注意，本标签搜索系统只能搜索文章标签，不能搜索文章标题或内容。因为标签系统刚刚实装，绝大多数文章还没有标签。所有没有标签的文章将无法被搜索到。</p>
          <p>如果你愿意协助打标签，请<a className='regular' href={ chapterHref('META/协助打标签.html') }>至此查看协助打标签的方式</a>。</p>
        </div>
      ),
      style: ContentBlockStyle.WARNING,
    });
    content.appendLeftSideContainer();
    const $textarea = (<textarea className='general small'/>) as HTMLTextAreaElement;
    $textarea.value = pagePath.get().split('/').join('\n');
    const updateTextAreaSize = autoExpandTextArea($textarea, 40);
    function openTagsList() {
      const modal = new Modal(
        <div style={{ width: '1000px' }}>
          <h1>标签列表</h1>
          <p>不是所有标签都有对应的文章。</p>
          <p>
            { data.tags.map(([tag]) => {
              let selected = $textarea.value.trim().split(/\s+/).includes(tag);
              const $tag = tagSpan(tag, selected);
              $tag.addEventListener('click', () => {
                if (selected) {
                  $textarea.value = $textarea.value.replace(new RegExp(`(^|\\s+)${tag}(?=$|\\s)`, 'g'), '');
                } else {
                  $textarea.value += `\n${tag}`;
                }
                $textarea.value = $textarea.value.trim();
                updateSearch($textarea.value);
                updateTextAreaSize();
                selected = !selected;
                $tag.classList.toggle('active', selected);
              });
              return $tag;
            }) }
          </p>
          <div className='button-container'>
            <div onclick={ () => modal.close() }>关闭</div>
          </div>
        </div> as HTMLDivElement
      );
      modal.setDismissible();
      modal.open();
    }
    let $errorList: HTMLElement | null = null;
    const searchBlock = content.addBlock({
      initElement: (
        <div>
          <p>请输入要搜索的标签：</p>
          { $textarea }
          <div className='button-container' style={{ marginTop: '0.6em' }}>
            <div onclick={ openTagsList }>选择标签</div>
          </div>
        </div>
      ),
      side: ContentBlockSide.LEFT,
    });
    const searchInfoBlock = content.addBlock({
      initElement: (
        <div>
          <h1>标签搜索</h1>
          <p>请在搜索输入框中输入需要查找的标签以开始搜索。</p>
          <p>多个标签之间请用空格或换行分开。</p>
          <p>在一个标签前添加减号可以排除这个标签。（例如：<code>-含有男性</code>）</p>
          <p>在一个标签前添加加号可以强制需要这个标签。（例如：<code>+贞操带</code>）</p>
          <p>你也可以点击搜索输入框下方的<b>选择标签</b>来快速选择。</p>
        </div>
      ),
    }).hide();
    const noResultsBlock = content.addBlock({
      initElement: (
        <div>
          <h1>抱歉，未找到任何匹配的文章</h1>
            <p>本标签搜索系统只能搜索文章标签，不能搜索文章标题或内容。请检查你所使用的搜索标签是否为正确的《朱语》文章标签。你可以点击搜索输入框下方的<b>选择标签</b>来列出所有可用的标签。</p>
          <p>同时，因为标签系统刚刚实装，绝大多数文章还没有标签。所有没有标签的文章将无法被搜索到。如果你发现你喜欢的文章还没有标签，你可以选择帮助打标签。</p>
        </div>
      ),
    }).hide();
    const chapterBlocks: Array<ContentBlock> = [];
    let searchId = 0;
    async function updateSearch(searchText: string) {
      searchId++;
      const thisSearchId = searchId;
      searchText = searchText.trim();
      const searchTerms = searchText.split(/\s+/).map(resolveAlias).filter(searchTerm => searchTerm !== '');
      pagePath.set(searchTerms.join('/'));
      const searchInput: SearchInput = searchTerms.map(searchTerm => {
        if (searchTerm.startsWith('+')) {
          return { searchTag: searchTerm.substr(1), type: 'required' };
        }
        if (searchTerm.startsWith('-')) {
          return { searchTag: searchTerm.substr(1), type: 'excluded' };
        }
        return { searchTag: searchTerm, type: 'favored' };
      });
      const searchResult = await search(searchInput);
      if (thisSearchId !== searchId) {
        // New search launched.
        return;
      }
      const errors: Array<HTMLElement> = [];
      for (const { searchTag } of searchInput) {
        const match = searchTag.match(/^[+-]?(\S+?)(?:（(\S+?)）)?$/)!;
        const tagTuple = data.tags.find(([tag]) => tag === match[1]);
        if (tagTuple === undefined) {
          errors.push(<li>标签“{ match[1] }”不存在。</li>);
        } else if (match[2] !== undefined) {
          if (tagTuple[1] === null) {
            errors.push(<li>标签“{ match[1] }”不支持性别变种。</li>);
          } else if (!tagTuple[1].includes(match[2])) {
            errors.push(<li>标签“{ match[1] }”没有性别变种“{ match[2] }”。</li>);
          }
        }
      }
      $errorList?.remove();
      if (errors.length !== 0) {
        $errorList = (
          <ul>{ ...errors }</ul>
        );
        searchBlock.element.append($errorList);
      }
      chapterBlocks.forEach(chapterBlock => chapterBlock.directRemove());
      chapterBlocks.length = 0;
      function showResultsFrom(startIndex: number) {
        const maxIndex = Math.min(searchResult.length - 1, startIndex + 9);
        for (let i = startIndex; i <= maxIndex; i++) {
          const { chapter, score, matchedTags } = searchResult[i];
          const chapterBlock = content.addBlock({
            initElement: (
              <div className='tag-search-chapter'>
                { (searchInput.length !== 1) && (
                  <p className='match-ratio'>匹配率：<span style={{
                    fontWeight: (score === searchInput.length) ? 'bold' : 'normal'
                  }}>{ (score / searchInput.length * 100).toFixed(0) }%</span></p>
                ) }
                <h3 className='chapter-title'>
                  <a href={ chapterHref(chapter.htmlRelativePath) }>
                    { formatRelativePath(chapter.htmlRelativePath) }
                  </a>
                </h3>
                <p>{ chapter.authors.map(authorInfo => authorInfo.role + '：' + authorInfo.name).join('，') }</p>
                { chapter.tags?.map(tag => {
                  const selected = matchedTags.includes(tag);
                  const $tag = tagSpan(tag, selected);
                  $tag.addEventListener('click', () => {
                    if (!selected) {
                      $textarea.value += `\n${tag}`;
                    } else {
                      let value = $textarea.value.replace(new RegExp(`(^|\\s+)\\+?${tag}(?=$|\\s)`, 'g'), '');
                      if (tag.includes('（')) {
                        value = value.replace(new RegExp(`(^|\\s+)\\+?${tag.split('（')[0]}(?=$|\\s)`, 'g'), '');
                      }
                      value = value.trim();
                      $textarea.value = value;
                    }
                    updateSearch($textarea.value);
                    updateTextAreaSize();
                  });
                  return $tag;
                }) }
              </div>
            )
          });
          if (i === maxIndex && maxIndex < searchResult.length - 1) {
            chapterBlock.onEnteringView(() => showResultsFrom(i + 1));
          }
          chapterBlocks.push(chapterBlock);
        }
      }
      noResultsBlock.hide();
      searchInfoBlock.hide();
      if (searchResult.length === 0) {
        if (searchText === '') {
          searchInfoBlock.show();
        } else {
          noResultsBlock.show();
        }
      } else {
        showResultsFrom(0);
      }
    }
    updateSearch($textarea.value);
    $textarea.addEventListener('input', () => updateSearch($textarea.value));
    return true;
  },
};

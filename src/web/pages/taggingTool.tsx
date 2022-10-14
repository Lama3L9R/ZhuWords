import { $e } from '../$e';
import { TagSpec, TagsSpec } from '../../TagsSpec';
import { Content } from '../control/contentControl';
import { confirm, Modal, showGenericError, showGenericSuccess } from '../control/modalControl';
import { setNavbarPath } from '../control/navbarControl';
import { Page } from '../control/pageControl';
import { dbKVGet, dbKVKey, dbKVSet } from '../data/db';
import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { autoExpandTextArea } from '../util/DOM';

const debugLogger = new DebugLogger('Tagging Tool');

const selectedKey = dbKVKey<Array<string>>('taggingToolSelected');
const showingVariantsKey = dbKVKey<Array<string>>('taggingToolShowingVariants');

function createTagVariant(tag: string, variant: string) {
  return `${tag}（${variant}）`;
}

export const taggingTool: Page = {
  name: 'tagging-tool',
  handler: (content: Content) => {
    setNavbarPath([{ display: '标签工具', hash: null }]);
    const loadingBlock = content.addBlock({
      initElement: h('div', '正在加载标签规格...')
    });
    (async () => {
      const tagsSpec: TagsSpec = JSON.parse(await fetch('./tagsSpec.json')
        .then(response => response.text()));
      const showingVariants = new Set(await dbKVGet(showingVariantsKey) ?? ['女']);
      loadingBlock.directRemove();
      /** Mapping from tag to tag spec */
      const tagSpecMap: Map<string, TagSpec> = new Map();
      const tagIndexMap: Map<string, number> = new Map();
      let index = 0;
      for (const tagSpec of tagsSpec) {
        tagSpecMap.set(tagSpec.tag, tagSpec);
        tagIndexMap.set(tagSpec.tag, index);
        index++;
      }
      const selectedTagVariants = new Set<string>();
      const mainBlock = content.addBlock({ initElement: h('.tagging-tool') as HTMLDivElement });
      const tagVariantElementsMap: Map<string, Array<{
        span: HTMLSpanElement,
        checkbox: HTMLInputElement,
      }>> = new Map();
      const variantsSet = new Set<string>();
      tagsSpec.forEach(tagSpec => tagSpec.variants?.forEach(variant => variantsSet.add(variant)));
      const variantMap: Map<string, Array<{
        tagVariantSpan: HTMLSpanElement,
        tag: string,
      }>> = new Map(Array.from(variantsSet).map(variant => [variant, []]));
      const prerequisiteLIs = new Array<HTMLLIElement>();
      const prerequisites: Array<{
        sourceTagVariant: string,
        requiresTagVariants: Array<string>,
        span: HTMLSpanElement,
        li: HTMLLIElement,
      }> = [];
      const $selectedOutputCode = h('code');
      function setSelected(tagVariant: string, value: boolean) {
        const tagVariantElements = tagVariantElementsMap.get(tagVariant);
        if (tagVariantElements === undefined) {
          debugLogger.warn('Unknown tag variant:', tagVariant);
          return false;
        }
        for (const { checkbox, span } of tagVariantElements) {
          checkbox.checked = value;
          span.classList.toggle('selected', value);
        }
        if (value) {
          selectedTagVariants.add(tagVariant);
        } else {
          selectedTagVariants.delete(tagVariant);
        }
        for (const prerequisiteLI of prerequisiteLIs) {
          prerequisiteLI.classList.remove('errored');
        }
        for (const tagVariantElements of tagVariantElementsMap.values()) {
          for (const { span } of tagVariantElements) {
            span.classList.remove('errored');
          }
        }
        let errored = false;
        for (const { sourceTagVariant, requiresTagVariants, span, li } of prerequisites) {
          if (selectedTagVariants.has(sourceTagVariant) && !requiresTagVariants.some(requiresTagVariant => selectedTagVariants.has(requiresTagVariant))) {
            errored = true;
            li.classList.add('errored');
            span.classList.add('errored');
          }
        }
        if (errored) {
          $selectedOutputCode.innerText = '有未满足的前置标签，输出已终止。缺失的前置标签已用红色标出。';
        } else if (selectedTagVariants.size === 0) {
          $selectedOutputCode.innerText = '请至少选择一个标签。';
        } else {
          $selectedOutputCode.innerText = Array
            .from(selectedTagVariants)
            .sort((a, b) => {
              const aTag = a.split('（')[0];
              const bTag = b.split('（')[0];
              const comparePriority = tagSpecMap.get(bTag)!.priority - tagSpecMap.get(aTag)!.priority;
              if (comparePriority !== 0) {
                return comparePriority;
              }
              return tagIndexMap.get(aTag)! - tagIndexMap.get(bTag)!;
            })
            .join('，');
        }
        dbKVSet(selectedKey, Array.from(selectedTagVariants)).catch(error => debugLogger.error(error));
        return true;
      }
      function setHovered(tagVariant: string, hovered: boolean) {
        const tagVariantElements = tagVariantElementsMap.get(tagVariant)!;
        for (const { span } of tagVariantElements) {
          span.classList.toggle('hovered', hovered);
        }
      }
      function createTagVariantElements(display: string, tag: string, variant?: string) {
        const tagVariant = (variant === undefined) ? tag : createTagVariant(tag, variant);
        const $checkbox = h('input', { type: 'checkbox' });
        let tagVariantElements = tagVariantElementsMap.get(tagVariant);
        if (tagVariantElements === undefined) {
          tagVariantElements = [];
          tagVariantElementsMap.set(tagVariant, tagVariantElements);
        }
        const $tagVariantSpan = h('span.tagging-tool-tag-variant', [
          $checkbox,
          display,
        ]) as HTMLSpanElement;
        if (variant !== undefined) {
          variantMap.get(variant)!.push({
            tag,
            tagVariantSpan: $tagVariantSpan,
          });
        }
        tagVariantElements.push({
          checkbox: $checkbox,
          span: $tagVariantSpan,
        });
        $tagVariantSpan.addEventListener('click', () => {
          if (selectedTagVariants.has(tagVariant)) {
            setSelected(tagVariant, false);
          } else {
            setSelected(tagVariant, true);
          }
        });
        $tagVariantSpan.addEventListener('mouseenter', () => {
          setHovered(tagVariant, true);
        });
        $tagVariantSpan.addEventListener('mouseleave', () => {
          setHovered(tagVariant, false);
        });
        return $tagVariantSpan;
      }
      function createTagElement(tagSpec: TagSpec, prerequisiteInfo?: { li: HTMLLIElement, sourceTagSpec: TagSpec }) {
        if (tagSpec.variants === null) {
          const $span = createTagVariantElements(tagSpec.tag, tagSpec.tag);
          if (prerequisiteInfo !== undefined) {
            const sourceTagSpec = prerequisiteInfo.sourceTagSpec;
            if (sourceTagSpec.variants === null) {
              prerequisites.push({
                sourceTagVariant: sourceTagSpec.tag,
                requiresTagVariants: [ tagSpec.tag ],
                li: prerequisiteInfo.li,
                span: $span,
              });
            } else {
              for (const sourceVariant of sourceTagSpec.variants) {
                prerequisites.push({
                  sourceTagVariant: createTagVariant(sourceTagSpec.tag, sourceVariant),
                  requiresTagVariants: [ tagSpec.tag ],
                  li: prerequisiteInfo.li,
                  span: $span,
                });
              }
            }
          }
          return $span;
        } else {
          const spans: Array<HTMLSpanElement> = [];
          for (const variant of tagSpec.variants) {
            const $span = createTagVariantElements(
              variant,
              tagSpec.tag,
              variant,
            );
            if (prerequisiteInfo !== undefined) {
              const sourceTagSpec = prerequisiteInfo.sourceTagSpec;
              if (sourceTagSpec.variants !== null) {
                prerequisites.push({
                  sourceTagVariant: createTagVariant(sourceTagSpec.tag, variant),
                  requiresTagVariants: [ createTagVariant(tagSpec.tag, variant) ],
                  li: prerequisiteInfo.li,
                  span: $span,
                });
              } else {
                prerequisites.push({
                  sourceTagVariant: sourceTagSpec.tag,
                  requiresTagVariants: tagSpec.variants.map(variant => createTagVariant(tagSpec.tag, variant)),
                  li: prerequisiteInfo.li,
                  span: $span,
                });
              }
            }
            spans.push($span);
          }
          return h(
            'span.tagging-tool-tag',
            [
              tagSpec.tag,
              h('span.no-available-variants', '无可用变种'),
              ...spans,
            ],
          );
        }
      } // TODO
      mainBlock.element.append(
        <h1>标签工具</h1>,
        <p>请注意，在《朱语》的标签系统中：
          <ul>
            <li>标签变种“男”是指非伪娘男性。如果小说中的角色是伪娘，请勿使用男性标签变种。</li>
            <li>标签变种“机械”是指非人形机械，例如大型调教设备。如果小说中的角色是机器人，请用机器人的性别。</li>
            <li>概括性描写涉及的内容<b>无需被打标签</b>。
              <ul>
                <li>概括性描写是指匆匆略过而不展开的描写方式。举个例子：提到某设备有电击功能，但是完全没有描写该电击功能被使用的场景。在这个情况下，则无需选择标签【电击】。</li>
                <li>如果全篇文章大范围使用概括性描写，请选择标签【概括性描写为主】（在最后）。</li>
              </ul>
            </li>
          </ul>
        </p>,
        <h2>标签变种过滤</h2>,
        <p>请选择在小说中出现的人物性别。</p>,
        <p>这些选项只会暂时隐藏对应的标签变种，在输出标签列表时，依然会输出在隐藏前所选择的标签。</p>,
      );
      const updateVariantFilter: Array<() => void> = [];
      for (const variant of variantsSet) {
        let selected = showingVariants.has(variant);
        const $checkbox = h('input', { type: 'checkbox' });
        const $span = h('span.tagging-tool-variant', [
          $checkbox,
          variant,
        ]);
        const update = () => {
          if (selected) {
            showingVariants.add(variant);
          } else {
            showingVariants.delete(variant);
          }
          dbKVSet(showingVariantsKey, Array.from(showingVariants));
          $checkbox.checked = selected;
          $span.classList.toggle('selected', selected);
          variantMap.get(variant)!.forEach(({ tagVariantSpan }) => {
            tagVariantSpan.classList.toggle('display-none', !selected);
            tagVariantSpan.parentElement!.classList.toggle(
              'has-available-variant',
              Array.from(tagVariantSpan.parentElement!.getElementsByClassName('tagging-tool-tag-variant'))
                .some($element => !$element.classList.contains('display-none')),
            );
          });
        };
        updateVariantFilter.push(update);
        $span.addEventListener('click', () => {
          selected = !selected;
          update();
        });
        mainBlock.element.append($span);
      }
      mainBlock.element.append(h('h2', '选择标签'));
      function requestResettingTags() {
        confirm('真的要重置所有选择的标签吗？', '这个操作不可撤销。', '确定重置', '不重置').then(result => {
          if (result) {
            for (const selectedTagVariant of selectedTagVariants) {
              setSelected(selectedTagVariant, false);
            }
          }
        });
      }
      function requestImportTags() {
        const $textarea = <textarea className='general large' /> as HTMLTextAreaElement;
        async function execute(replace: boolean) {
          const value = $textarea.value.trim();
          if (value === '') {
            showGenericError('请输入要导入的标签。');
            return;
          }
          if (replace) {
            if (!await confirm('确定导入', '这将重置目前已经选择的所有标签。你真的要继续吗？', '确定导入', '取消导入')) {
              return;
            }
            for (const selectedTagVariant of selectedTagVariants) {
              setSelected(selectedTagVariant, false);
            }
          }
          const failed: Array<string> = [];
          for (const tagVariant of value.split(/[\s，,]+/)) {
            if (!setSelected(tagVariant, true)) {
              failed.push(tagVariant);
            }
          }
          if (failed.length === 0) {
            await showGenericSuccess('导入成功');
            modal.close();
          } else {
            const warnModal = new Modal(
              <div>
                <h1>部分标签未能导入</h1>
                <p>以下为导入失败的标签：</p>
                <ul>{ failed.map(tagVariant => <li>{ tagVariant }</li>) }</ul>
                <p>其余标签已导入完成。</p>
                <div className='button-container'><div onclick={ () => warnModal.close() }>关闭</div></div>
              </div> as HTMLDivElement
            );
            warnModal.setDismissible();
            warnModal.open();
          }
        }
        const modal = new Modal(
          <div>
            <h1>导入标签</h1>
            <p>请输入要导入的标签，不同标签之间请用空格或逗号分开：</p>
            { $textarea }
            <div className='button-container' style={{ marginTop: '0.6em' }}>
              <div onclick={ () => execute(true) }>替换当前标签</div>
              <div onclick={ () => execute(false) }>追加到当前标签</div>
              <div onclick={ () => modal.close() }>取消导入</div>
            </div>
          </div> as HTMLDivElement
        );
        modal.setDismissible();
        modal.open();
        autoExpandTextArea($textarea);
      }
      mainBlock.element.append(
        <div className='button-container'>
          <div onclick={ requestResettingTags }>重置所有选择的标签</div>
          <div onclick={ requestImportTags }>导入标签</div>
        </div>
      );
      mainBlock.element.append(<p>请选择小说所含有的标签：</p>);
      for (const tagSpec of tagsSpec) {
        mainBlock.element.append(h('p.tag-title', createTagElement(tagSpec)));
        const $descUL = h('ul');
        for (const descLine of tagSpec.desc) {
          const $descLineLI = h('li.desc-line') as HTMLLIElement;
          if (descLine.isPrerequisite) {
            prerequisiteLIs.push($descLineLI);
          }
          for (const segment of descLine.segments) {
            if (segment.type === 'text') {
              $descLineLI.append(segment.content);
            } else {
              if (descLine.isPrerequisite) {
                $descLineLI.append(createTagElement(
                  tagSpecMap.get(segment.tag)!, {
                  li: $descLineLI,
                  sourceTagSpec: tagSpec,
                })
                );
              } else {
                $descLineLI.append(createTagElement(tagSpecMap.get(segment.tag)!));
              }
            }
          }
          $descUL.append($descLineLI);
        }
        mainBlock.element.append($descUL);
      }
      mainBlock.element.append(h('h2', '输出'));
      mainBlock.element.append(h('p', '以下为选择的标签。'));
      mainBlock.element.append(h('pre.wrapping', $selectedOutputCode));
      mainBlock.element.append(
        <p>
          如果想要为其他文章打标签，请<span className='anchor-style' onclick={ requestResettingTags }>点此重置已经选择了的标签</span>。
        </p>
      );
      updateVariantFilter.forEach(update => update());
      (await dbKVGet(selectedKey) ?? []).forEach(tagVariant => setSelected(tagVariant, true));
    })().catch(error => debugLogger.error(error));
    return true;
  },
};

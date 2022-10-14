import { $e } from '../$e';
import { Chapter } from '../../Data';
import { enablePushHelper } from '../data/settings';
import { Content, ContentBlockSide } from './contentControl';
import { Modal } from './modalControl';

export function addPushHelperBlock(content: Content, chapter: Chapter) {
  if (!enablePushHelper.getValue()) {
    return;
  }
  content.addBlock({
    initElement: (
      <div>
        <h3>推送助手</h3>
        <div className='button-container'>
          <div onclick={() => {
            openPushHelper(chapter);
          }}>打开推送助手</div>
        </div>
          <p>推送助手是给《朱语》的编辑们使用的工具。如果你不是《朱语》的编辑，你可以前往设置并禁用推送助手。</p>
      </div>
    ),
    side: ContentBlockSide.LEFT,
  });
}

function openPushHelper(chapter: Chapter) {
  const tags = [...new Set(chapter.tags?.map(tagVariant => `#${tagVariant.split('（')[0]}`) ?? [])];
  const modal = new Modal(
    <div>
      <h1>推送助手</h1>
      <p>字数：{chapter.charsCount}</p>
      <p>标签：</p>
      <pre className='wrapping'>
        <code>{tags.join(' ')}</code>
      </pre>
      <div className='button-container'>
        <div onclick={() => modal.close()}>关闭</div>
      </div>
    </div> as HTMLDivElement
  );
  modal.setDismissible();
  modal.open();
}

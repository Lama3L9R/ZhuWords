import { $e } from '../$e';
import { dbKVGet, dbKVKey, dbKVSet } from '../data/db';
import { DebugLogger } from '../DebugLogger';
import { contactInfoElement } from './contactInfoControl';
import { Modal } from './modalControl';

const debugLogger = new DebugLogger('Lose Contact Prevention');
const hasShownKey = dbKVKey<boolean>('loseContactPreventionHasShown');

export async function initLoseContactPrevention() {
  try {
    if (await dbKVGet(hasShownKey) || true) {
      return;
    }
    const modal = new Modal(
      <div style={{
        width: '850px',
      }}>
        <h1>防失联信息</h1>
        <p>本消息只显示一次。</p>
        <p>可能大家已经知道了，即使我们如此严格地禁止在 QQ 群内讨论色情/政治内容，我们的 QQ ① 群还是被封了，并且没有给出任何封禁的理由。为了防止失联，欢迎通过以下方式加入我们的讨论组/频道。</p>
        { contactInfoElement() }
        <p>除此之外，你也可以把本站的地址记下来。不过，我只能尽量确保网站地址不变。</p>
        <div className='button-container'>
          <div onclick={ () => modal.close() }>关闭</div>
        </div>
      </div> as HTMLDivElement
    );
    modal.setDismissible();
    modal.open();
    await dbKVSet(hasShownKey, true);
  } catch (error) {
    debugLogger.error(error);
  }
}

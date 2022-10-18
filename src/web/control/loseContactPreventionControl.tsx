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
      </div> as HTMLDivElement
    ); // TOOD: 暂时先 delete 处理
    modal.setDismissible();
    modal.open();
    await dbKVSet(hasShownKey, true);
  } catch (error) {
    debugLogger.error(error);
  }
}

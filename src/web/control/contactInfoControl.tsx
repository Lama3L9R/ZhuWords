import { $e } from '../$e';
import { contactInfo } from '../data/settings';
import { h } from '../hs';
import { Content } from './contentControl';

// TODO: UpdateInformation
export function contactInfoElement(){
  return (
    <ul>
      <li>
        Telegram 讨论组（暂时还未创建）：
        <a
          style={{
            wordBreak: 'break-all'
          }}
            href='https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          className='regular'
          target='_blank'
        >

        </a>
        <ul>
            <li> Telegram 讨论组（暂时还未创建）</li>
        </ul>
      </li>
      <li>
          Telegram 更新推送频道（暂时还未创建）：
        <a
          style={{
            wordBreak: 'break-all'
          }}
          href='https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          className='regular'
          target='_blank'
        >
            https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </a>
      </li>
    </ul>
  );
}

export function loadContactInfo(content: Content) {
  if (!contactInfo.getValue()) {
    return;
  }
  const block = content.addBlock({
    initElement: h('div',
      h('h3', '欢迎加入《朱语》相关讨论组'),
      contactInfoElement(),
      h('a.regular', {
        href: '#',
        onclick: ((event: any) => {
          event.preventDefault();
          block.directRemove();
          contactInfo.setValue(false);
        }),
      }, '点此永久关闭本提示'),
    ),
  });
}

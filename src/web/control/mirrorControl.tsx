import { $e } from '../$e';
import {
  GENERIC_CLOSE,
  MIRROR_DESC_0,
  MIRROR_DESC_0_NO_TOKEN,
  MIRROR_DESC_1,
  MIRROR_LANDING_CONFLICT_DESC,
  MIRROR_LANDING_CONFLICT_KEEP,
  MIRROR_LANDING_CONFLICT_OVERWRITE,
  MIRROR_LANDING_CONFLICT_TITLE,
  MIRROR_LANDING_INVALID_REFERRAL,
  MIRROR_LANDING_SUCCESS_HINT,
  MIRROR_PROVIDED_BY,
  MIRROR_TECHNOLOGY,
  MIRROR_TITLE,
  MIRROR_URL,
} from '../constant/messages';
import { mainSite, mirrorSites, mirrorSitesPlusMainSite } from '../constant/mirrorSites';
import { chapterHref, mirrorLandingHref } from '../data/hrefs';
import { h } from '../hs';
import { padName } from '../util/padName';
import { PathHandler } from './followQuery';
import { createHint } from './hintControl';
import { confirm, Modal, showGenericError } from './modalControl';
import { tokenItem } from './userControl';

export function showMirrorSitesModal(scroll?: number) {
  const modal = new Modal(h('.mirror-site-modal', [
    h('h1', MIRROR_TITLE),
    h('p', tokenItem.exists() ? MIRROR_DESC_0 : MIRROR_DESC_0_NO_TOKEN),
    h('p', MIRROR_DESC_1),
    h('.button-container', [
      ...mirrorSitesPlusMainSite.map(({ name, origin, provider, technology }) => {
        const $button = h('a.rich', {
          href: (origin === window.location.origin) ? '#' : mirrorLandingHref(origin, tokenItem.getValue()),
          onclick: (event: MouseEvent) => {
            event.preventDefault();
            if (origin === window.location.origin) {
              return;
            }
            window.location.replace(mirrorLandingHref(origin, tokenItem.getValue(), modal.modal.scrollTop));
          },
        }, [
          h('h2', name),
          h('p', [
            ...origin.startsWith('http://')
              ? [
                <span className='http-warning'>本镜像站未加密（使用 HTTP），非紧急情况请避免使用！</span>,
                <br />,
              ]
              : [],
            MIRROR_URL + origin,
            h('br'),
            MIRROR_PROVIDED_BY + provider,
            h('br'),
            MIRROR_TECHNOLOGY + technology,
          ]),
        ]);
        if (origin === window.location.origin) {
          $button.classList.add('selected');
        }
        return $button;
      }),
      h('div', {
        onclick: () => modal.close(),
      }, GENERIC_CLOSE),
    ]),
  ]) as HTMLDivElement);
  modal.setDismissible();
  modal.open();
  if (scroll !== undefined) {
    modal.modal.scrollTop = scroll;
  }
}

export const mirrorLandingHandler: PathHandler = (_, args) => {
  // Prevent leaving the token in browser history
  window.history.replaceState(null, document.title, '#/mirror-landing');
  window.location.hash = '#';
  showMirrorSitesModal(args.has('scroll') ? +args.get('scroll')! : undefined);
  const newToken = args.get('token');
  if (newToken === undefined) {
    return true;
  }
  if (!mirrorSitesPlusMainSite.some(
    mirror => document.referrer === mirror.origin
      || document.referrer.startsWith(mirror.origin + '/'))
  ) {
    showGenericError(MIRROR_LANDING_INVALID_REFERRAL);
    return true;
  }
  const oldToken = tokenItem.getValue();
  if (oldToken !== null) {
    if (oldToken !== newToken) {
      confirm(
        MIRROR_LANDING_CONFLICT_TITLE,
        MIRROR_LANDING_CONFLICT_DESC,
        MIRROR_LANDING_CONFLICT_OVERWRITE,
        MIRROR_LANDING_CONFLICT_KEEP,
      ).then(result => {
        if (result) {
          // Overwrite
          tokenItem.setValue(newToken);
          createHint(MIRROR_LANDING_SUCCESS_HINT);
        }
      });
    }
  } else {
    // No conflict
    tokenItem.setValue(newToken);
    createHint(MIRROR_LANDING_SUCCESS_HINT);
  }

  return true;
};

const currentMirrorSite = mirrorSites.find(({ origin }) => origin === window.location.origin);
const $changeSiteSpan = <span onclick={() => showMirrorSitesModal()}>点此更换</span>;

if (currentMirrorSite !== undefined) {
  document.body.append(
    <div className='mirror-hint'>当前正在使用由{padName(currentMirrorSite.provider)}提供的镜像站，{$changeSiteSpan}。</div>
  );
} else if (window.location.origin === mainSite.origin) {
  document.body.append(
    <div className='mirror-hint'>当前正在使用主站，{$changeSiteSpan}。</div>
  );
} else {
  document.body.append(
    <div className='mirror-hint'>当前正在使用未知镜像站，{$changeSiteSpan}。</div>
  );
}

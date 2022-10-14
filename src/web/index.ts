import { BUILD_FAILED_DESC, BUILD_FAILED_OK, BUILD_FAILED_TITLE } from './constant/messages';
import './control/analyticsControl';
import { followQuery, initPathHandlers } from './control/followQuery';
import { initLoseContactPrevention } from './control/loseContactPreventionControl';
import { notify } from './control/modalControl';
import './control/navbarControl';
import { init, tokenItem } from './control/userControl';
import { data } from './data/data';
import { animation } from './data/settings';
import { id } from './util/DOM';

const $warning = id('warning');

if ($warning !== null) {
  $warning.addEventListener('click', () => {
    $warning.style.opacity = '0';
    if (animation.getValue()) {
      $warning.addEventListener('transitionend', () => {
        $warning.remove();
      });
    } else {
      $warning.remove();
    }
  });
}

const $buildNumber = id('build-number');
$buildNumber.innerText = `Build ${data.buildNumber}`;

if (tokenItem.exists()) {
  init(tokenItem.getValue()!);
}

if (data.buildError) {
  notify(BUILD_FAILED_TITLE, BUILD_FAILED_DESC, BUILD_FAILED_OK);
}

initPathHandlers();

window.addEventListener('popstate', () => {
  followQuery();
});

followQuery();

initLoseContactPrevention();

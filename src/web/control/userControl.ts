
import {
  GENERIC_CANCEL,
  GENERIC_CLOSE,
  GENERIC_CONFIRM,
  GENERIC_INTERNET_ERROR,
  USER_TOKEN_CHANGE_CHECKING,
  USER_TOKEN_CHANGE_DESC,
  USER_TOKEN_CHANGE_EMPTY,
  USER_TOKEN_CHANGE_INPUT_LABEL,
  USER_TOKEN_CHANGE_INVALID,
  USER_TOKEN_CHANGE_SUCCESS,
  USER_TOKEN_CHANGE_TITLE,
  USER_TOKEN_DOES_NOT_EXIST,
  USER_UPDATE_PROFILE_DESC,
  USER_UPDATE_PROFILE_DISPLAY_NAME_EMPTY,
  USER_UPDATE_PROFILE_DISPLAY_NAME_INPUT_LABEL,
  USER_UPDATE_PROFILE_EMAIL_INPUT_LABEL,
  USER_UPDATE_PROFILE_ERROR_NOT_INITIALIZED,
  USER_UPDATE_PROFILE_HINT_DISPLAY_NAME,
  USER_UPDATE_PROFILE_HINT_EMAIL_0,
  USER_UPDATE_PROFILE_HINT_EMAIL_1,
  USER_UPDATE_PROFILE_HINT_EMAIL_GRAVATAR_LINK,
  USER_UPDATE_PROFILE_HINT_USER_NAME,
  USER_UPDATE_PROFILE_LOADING,
  USER_UPDATE_PROFILE_SUCCESS,
  USER_UPDATE_PROFILE_TITLE,
  USER_UPDATE_PROFILE_USER_NAME_INPUT_LABEL
} from '../constant/messages';
import { pageHref } from '../data/hrefs';
import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { ItemDecoration, ItemHandle, ItemLocation } from '../Menu';
import { externalLink } from '../util/DOM';
import { fetchInit, fetchRegister, fetchUpdateProfile, getErrorMessage, ResultOf } from './backendControl';
import { mainMenu } from './menuControl';
import { Modal, showGenericError, showGenericHint, showGenericLoading, showGenericSuccess } from './modalControl';
import { StringPersistentItem } from './persistentItem';

const debugLogger = new DebugLogger('User Control');

export const tokenItem = new StringPersistentItem('token');
let initializedData: {
  userName: string,
  displayName: string,
  email: string | null,
} | null = null;

export async function registerWithResultPopup(displayName: string, email: string | null): Promise<boolean> {
  let result: ResultOf<typeof fetchRegister>;
  try {
    result = await fetchRegister(displayName, email ?? undefined);
  } catch (error) {
    showGenericError(GENERIC_INTERNET_ERROR);
    debugLogger.error(error);
    return false;
  }
  if (!result.success) {
    showGenericError(getErrorMessage(result.code));
    return false;
  } else {
    tokenItem.setValue(result.token);
    initializedData = {
      displayName,
      userName: result.user_name,
      email,
    };
    return true;
  }
}

export function getCurrentUser() {
  return initializedData;
}

let newMentionLink: null | ItemHandle = null;
export function removeNewMentionLink() {
  if (newMentionLink === null) {
    return;
  }
  newMentionLink.remove();
  newMentionLink = null;
}
enum InitResult {
  SUCCESS,
  ERROR_NETWORK,
  ERROR_TOKEN,
}
export async function init(token: string) {
  // 以下代码用于从后端拉取是否有新回复
  // 这一步不会记录任何个人数据
  debugLogger.log('Initializing.');
  removeNewMentionLink();
  let data: ResultOf<typeof fetchInit>;
  try {
    data = await fetchInit(token);
  } catch (error) {
    debugLogger.warn('Initialization failed: ', error);
    return InitResult.ERROR_NETWORK;
  }
  if (data.success) {
    tokenItem.setValue(token);
    initializedData = {
      displayName: data.display_name,
      email: data.email ?? null,
      userName: data.user_name,
    };
    debugLogger.log(`Initialization result: ${data.mentions} new mentions.`);
    if (data.mentions !== 0) {
      newMentionLink = mainMenu.addItem(`您有 ${data.mentions} 条新回复`, {
        button: true,
        link: pageHref('recent-mentions'),
        decoration: ItemDecoration.ICON_NOTIFICATION,
        location: ItemLocation.BEFORE,
      });
      newMentionLink.addClass('force-small');
    }
    return InitResult.SUCCESS;
  } else {
    debugLogger.warn('Initialization failed: Invalid token.');
    return InitResult.ERROR_TOKEN;
  }
}

export function showLoginModal() {
  const initialTokenValue = tokenItem.getValue() ?? '';
  const $tokenInput: HTMLInputElement = h('input', {
    value: initialTokenValue,
  }) as HTMLInputElement;
  const $confirmButton = h('div.display-none', {
    onclick: () => {
      if ($tokenInput.value === '') {
        showGenericError(USER_TOKEN_CHANGE_EMPTY);
        return;
      }
      const loadingModal = showGenericLoading(USER_TOKEN_CHANGE_CHECKING);
      debugLogger.log('Changing token...');
      init($tokenInput.value).then(initResult => {
        if (initResult === InitResult.SUCCESS) {
          debugLogger.log('Change token successful.');
          showGenericSuccess(USER_TOKEN_CHANGE_SUCCESS).then(() => {
            loginModal.close();
          });
        } else {
          if (initResult === InitResult.ERROR_NETWORK) {
            showGenericError(GENERIC_INTERNET_ERROR);
          } else {
            showGenericError(USER_TOKEN_CHANGE_INVALID);
          }
        }
      }).finally(() => {
        loadingModal.close();
      });
    },
  }, GENERIC_CONFIRM);
  const $closeButton = h('div', {
    onclick: () => {
      loginModal.close();
    }
  }, GENERIC_CLOSE);
  $tokenInput.addEventListener('input', () => {
    if ($tokenInput.value === initialTokenValue) {
      $confirmButton.classList.add('display-none');
      $closeButton.innerText = GENERIC_CLOSE;
    } else {
      $confirmButton.classList.remove('display-none');
      $closeButton.innerText = GENERIC_CANCEL;
    }
  });
  const loginModal = new Modal(h('div', [
    h('h1', USER_TOKEN_CHANGE_TITLE),
    ...USER_TOKEN_CHANGE_DESC.split('\n').map(p => h('p', p)),
    h('.input-group', [
      h('span', USER_TOKEN_CHANGE_INPUT_LABEL),
      $tokenInput,
    ]),
    h('.button-container', [
      $confirmButton,
      $closeButton,
    ]),
  ]));
  loginModal.open();
}

export function showUpdateProfileModal() {
  return new Promise<void>(resolve => {
    if (!tokenItem.exists()) {
      showGenericHint(USER_TOKEN_DOES_NOT_EXIST);
      return;
    }
    const userData = initializedData;
    if (userData === null) {
      showGenericError(USER_UPDATE_PROFILE_ERROR_NOT_INITIALIZED);
      console.error(1);
      return;
    }
    const $nameInput: HTMLInputElement = h('input', {
      value: userData.displayName,
    }) as HTMLInputElement;
    const $emailInput: HTMLInputElement = h('input', {
      value: userData.email ?? '',
    }) as HTMLInputElement;
    const updateProfileModal = new Modal(h('div', [
      h('h1', USER_UPDATE_PROFILE_TITLE),
      ...USER_UPDATE_PROFILE_DESC.split('\n').map(p => h('p', p)),
      h('ul', [
        h('li', USER_UPDATE_PROFILE_HINT_USER_NAME),
        h('li', USER_UPDATE_PROFILE_HINT_DISPLAY_NAME),
        h('li', [
          USER_UPDATE_PROFILE_HINT_EMAIL_0,
          externalLink(USER_UPDATE_PROFILE_HINT_EMAIL_GRAVATAR_LINK, 'https://cn.gravatar.com/'),
          USER_UPDATE_PROFILE_HINT_EMAIL_1,
        ]),
      ]),
      h('.input-group', [
        h('span', USER_UPDATE_PROFILE_USER_NAME_INPUT_LABEL + '@' + userData.userName),
      ]),
      h('.input-group', [
        h('span', USER_UPDATE_PROFILE_DISPLAY_NAME_INPUT_LABEL),
        $nameInput,
      ]),
      h('.input-group', [
        h('span', USER_UPDATE_PROFILE_EMAIL_INPUT_LABEL),
        $emailInput,
      ]),
      h('.button-container', [
        h('div', {
          onclick: () => {
            if ($nameInput.value === '') {
              showGenericError(USER_UPDATE_PROFILE_DISPLAY_NAME_EMPTY);
              return;
            }
            const loadingModal = showGenericLoading(USER_UPDATE_PROFILE_LOADING);
            debugLogger.log('Updating profile...');
            const newDisplayName = $nameInput.value;
            const newEmail = ($emailInput.value === '') ? undefined : $emailInput.value;
            fetchUpdateProfile(tokenItem.getValue()!, newDisplayName, newEmail)
              .then(result => {
                if (result.success) {
                  showGenericSuccess(USER_UPDATE_PROFILE_SUCCESS).then(() => {
                    updateProfileModal.close();
                    resolve();
                  });
                  userData.displayName = newDisplayName;
                  userData.email = newEmail ?? null;
                  debugLogger.log('Update profile success');
                } else {
                  debugLogger.warn('Update profile failed, error code:', result.code, ', translated:', getErrorMessage(result.code));
                  showGenericError(getErrorMessage(result.code));
                }
              }, error => {
                showGenericError(GENERIC_INTERNET_ERROR);
                debugLogger.error('Update profile failed:', error);
              })
              .finally(() => {
                loadingModal.close();
              });
          }
        }, GENERIC_CONFIRM),
        h('div', {
          onclick: () => {
            updateProfileModal.close();
            resolve();
          }
        }, GENERIC_CANCEL),
      ]),
    ]));
    updateProfileModal.open();
  });
}

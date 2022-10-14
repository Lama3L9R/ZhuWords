import {
  COMMENTS_DELETE,
  COMMENTS_DELETE_CONFIRMATION,
  COMMENTS_DELETING,
  COMMENTS_FAILED,
  COMMENTS_LOADED,
  COMMENTS_LOADING,
  COMMENTS_LOSE_EDITED_CANCEL,
  COMMENTS_LOSE_EDITED_CONFIRM,
  COMMENTS_LOSE_EDITED_TITLE,
  COMMENTS_MENTION_LOADED,
  COMMENTS_MENTION_REPLIED_OK,
  COMMENTS_MENTION_REPLIED_TITLE,
  COMMENTS_MENTION_SECTION,
  COMMENTS_MODIFIED_DATE,
  COMMENTS_RECENT_LOADED,
  COMMENTS_RECENT_SECTION,
  COMMENTS_REPLY,
  COMMENTS_SECTION,
  COMMENTS_SEND,
  COMMENTS_SENDING,
  COMMENTS_SEND_CONFIRM,
  COMMENTS_SEND_DISPLAY_NAME_0,
  COMMENTS_SEND_DISPLAY_NAME_1,
  COMMENTS_SEND_DISPLAY_NAME_EDIT,
  COMMENTS_SEND_DISPLAY_NAME_PREFIX,
  COMMENTS_SEND_EMAIL_INPUT_PREFIX,
  COMMENTS_SEND_HINT,
  COMMENTS_SEND_TITLE,
  COMMENTS_SUBMIT_BY,
  GENERIC_CANCEL,
  GENERIC_CONFIRM,
  GENERIC_INTERNET_ERROR,
  GO_TO_MENU
} from '../constant/messages';
import { AutoCache, AutoSingleCache } from '../data/AutoCache';
import { ChapterContext } from '../data/data';
import { chapterHref } from '../data/hrefs';
import { useComments } from '../data/settings';
import { DebugLogger } from '../DebugLogger';
import { h } from '../hs';
import { autoExpandTextArea, linkButton } from '../util/DOM';
import { formatRelativePath } from '../util/formatRelativePath';
import { formatTimeRelative } from '../util/formatTime';
import { padName } from '../util/padName';
import {
  CommentData,
  fetchDeleteComment,
  fetchGetChapterComments,
  fetchGetRecentComments,
  fetchGetRecentMentionedComments,
  fetchSendComment,
  getErrorMessage,
  ResultOf
} from './backendControl';
import { Content, ContentBlock } from './contentControl';
import { enterMenuMode } from './menuControl';
import { confirm, Modal, notify, showGenericError, showGenericLoading } from './modalControl';
import { getCurrentUser, registerWithResultPopup, showUpdateProfileModal, tokenItem } from './userControl';

const debugLogger = new DebugLogger('Comments Control');

async function promptDeleteComment(pageName: string, commentId: number) {
  if (await confirm(COMMENTS_DELETE, COMMENTS_DELETE_CONFIRMATION, GENERIC_CONFIRM, GENERIC_CANCEL)) {
    const loadingModal = showGenericLoading(COMMENTS_DELETING);
    try {
      await fetchDeleteComment(tokenItem.getValue()!, commentId);
    } catch (error) {
      showGenericError(GENERIC_INTERNET_ERROR);
      debugLogger.error(error);
      return false;
    } finally {
      loadingModal.close();
    }
    recentCommentsCache.delete();
    chapterCommentsCache.delete(pageName);
    return true;
  }
  return false;
}

function createCommentElement(comment: CommentData, onComment: () => void, showPath: boolean) {
  const pageName = comment.relative_path;
  const actionButton = (comment.user.user_name === getCurrentUser()?.userName)
    ? h('a.action', { // 删除按钮
      onclick: () => {
        promptDeleteComment(pageName!, comment.id).then(deleted => {
          if (deleted) {
            $comment.remove();
          }
        });
      },
    }, COMMENTS_DELETE)
    : pageName && h('a.action', { // 回复按钮
      onclick: () => {
        promptComment(pageName!, '@' + comment.user.user_name + ' ').then(replied => {
          if (replied) {
            onComment();
          }
        });
      },
    }, COMMENTS_REPLY);

  const $comment = h('.comment', [
    h('img.avatar', { src: comment.user.avatar_url }),
    h('.author', comment.user.display_name),
    h('.time', COMMENTS_SUBMIT_BY.replace('$', ` @${comment.user.user_name} `)
      + formatTimeRelative(new Date(comment.create_timestamp))
      + ((comment.create_timestamp === comment.update_timestamp)
        ? '' : COMMENTS_MODIFIED_DATE.replace('$', formatTimeRelative(new Date(comment.update_timestamp))))
    ),
    actionButton,
    ...comment.body.split('\n\n').map(paragraph => h('p', paragraph)),
    showPath ? h('p', h('a.dimmed', {
      href: chapterHref(pageName),
    }, `发表于${padName(formatRelativePath(pageName))}`)) : null,
  ]);
  return $comment;
}

function loadComments(
  content: Content,
  loadComment: () => Promise<Array<CommentData>>,
  title: string,
  desc: string,
  onComment: () => void,
  backButton: boolean = true,
  commentingPageName?: string,
) {
  const $commentsStatus = h('p', COMMENTS_LOADING);
  const $comments = h('.comments', [
    h('h1', title),
    $commentsStatus,
  ]) as HTMLDivElement;
  const block = content.addBlock({
    initElement: $comments,
  });

  block.onEnteringView(() => {
    loadComment().then(data => {
      if (content.isDestroyed) {
        debugLogger.log('Comments loaded, but abandoned since the original ' +
          'content page is already destroyed.');
        return;
      }
      debugLogger.log('Comments loaded.');
      $commentsStatus.innerText = desc;
      const appendCreateComment = (commentingPageName: string) => {
        $comments.appendChild(
          h('.create-comment', {
            onclick: () => {
              promptComment(commentingPageName).then(commented => {
                if (commented) {
                  onComment();
                }
              });
            },
          }, COMMENTS_SEND),
        );
      };
      if (commentingPageName !== undefined && data.length >= 6) {
        appendCreateComment(commentingPageName);
      }
      data.forEach((comment: any) => {
        $comments.appendChild(createCommentElement(comment, onComment, commentingPageName === undefined));
      });
      if (commentingPageName !== undefined) {
        appendCreateComment(commentingPageName);
      }
    }).catch(error => {
      $commentsStatus.innerText = COMMENTS_FAILED;
      debugLogger.error('Failed to load comments.', error);
    }).then(() => {
      if (backButton) {
        $comments.appendChild(createToMenuButton());
      }
    });
  });

  return block;
}

export function createToMenuButton() {
  return h('div.page-switcher', [
    h('a', {
      href: window.location.pathname,
      onclick: (event: MouseEvent) => {
        event.preventDefault();
        enterMenuMode();
      },
    }, GO_TO_MENU),
  ]);
}

export async function sendComment(token: string, pageName: string, content: string) {
  let result: ResultOf<typeof fetchSendComment>;
  try {
    result = await fetchSendComment(token, pageName, content);
  } catch (error) {
    showGenericError(GENERIC_INTERNET_ERROR);
    debugLogger.error(error);
    return false;
  }
  if (!result.success) {
    showGenericError(getErrorMessage(result.code));
    return false;
  } else {
    // Cache invalidation
    recentCommentsCache.delete();
    chapterCommentsCache.delete(pageName);
    return true;
  }
}

export function promptComment(pageName: string, preFilled?: string) {
  return new Promise<boolean>((resolve, reject) => {
    const $nameInput = h('input') as HTMLInputElement;
    const $emailInput = h('input') as HTMLInputElement;
    const user = getCurrentUser();
    const $displayNameSpan = h('span');
    const updateDisplayName = () => {
      if (user !== null) {
        $displayNameSpan.innerText = padName(user.displayName);
      }
    };
    updateDisplayName();
    const name = tokenItem.exists()
      ? user === null
        ? h('div', { style: { 'margin-bottom': '0.8em' } })
        : h('p', [
          COMMENTS_SEND_DISPLAY_NAME_0,
          $displayNameSpan,
          COMMENTS_SEND_DISPLAY_NAME_1,
          linkButton(COMMENTS_SEND_DISPLAY_NAME_EDIT, () => {
            showUpdateProfileModal().then(updateDisplayName);
          }),
        ])
      : [
        h('.input-group', [
          h('span', COMMENTS_SEND_DISPLAY_NAME_PREFIX),
          $nameInput,
        ]),
        h('.input-group', [
          h('span', COMMENTS_SEND_EMAIL_INPUT_PREFIX),
          $emailInput,
        ]),
      ];
    const $textarea = h('textarea.general.large') as HTMLTextAreaElement;
    if (preFilled !== undefined) {
      $textarea.value = preFilled;
    }

    const onSubmit = async () => {
      const loadingModal = showGenericLoading(COMMENTS_SENDING);
      try {
        if (!tokenItem.exists()) {
          if (!(await registerWithResultPopup(
            $nameInput.value,
            $emailInput.value.trim() === '' ? null : $emailInput.value
          ))) {
            return false;
          }
        }
        return await sendComment(tokenItem.getValue()!, pageName, $textarea.value);
      } finally {
        loadingModal.close();
      }
    };

    const modal = new Modal(h('div', [
      h('h1', COMMENTS_SEND_TITLE),
      h('p', COMMENTS_SEND_HINT),
      $textarea,
      name,
      h('.button-container', [
        h('div', { // Submit
          onclick: () => {
            onSubmit().then(commented => {
              if (commented) {
                modal.close();
                resolve(true);
              }
              return commented;
            }).catch(reject);
          }
        }, COMMENTS_SEND_CONFIRM),
        h('div', {
          onclick: () => {
            if ($textarea.value === '') {
              modal.close();
              resolve(false);
            } else {
              confirm(
                COMMENTS_LOSE_EDITED_TITLE,
                '',
                COMMENTS_LOSE_EDITED_CONFIRM,
                COMMENTS_LOSE_EDITED_CANCEL
              ).then(confirmed => {
                if (confirmed) {
                  modal.close();
                  resolve(false);
                }
              });
            }
          }
        }, GENERIC_CANCEL),
      ]),
    ]));
    modal.open();
    $textarea.focus();
    autoExpandTextArea($textarea);
  });
}

const chapterCommentsCache = new AutoCache<string, Array<CommentData>>(
  fetchGetChapterComments,
  new DebugLogger('Chapter Comments Cache'),
);
export function loadChapterComments(chapterCtx: ChapterContext, content: Content) {
  if (useComments.getValue() === false) {
    return;
  }
  let block: ContentBlock | null = null;
  const pageName = chapterCtx.chapter.htmlRelativePath;
  function load() {
    if (block !== null) {
      block.directRemove();
    }
    block = loadComments(
      content,
      () => chapterCommentsCache.get(pageName),
      COMMENTS_SECTION,
      COMMENTS_LOADED,
      load,
      false,
      chapterCtx.chapter.htmlRelativePath,
    );
  }
  load();
}

const recentCommentsCache = new AutoSingleCache<Array<CommentData>>(
  fetchGetRecentComments,
  new DebugLogger('Recent Comments Cache'),
);
export function loadRecentComments(content: Content) {
  let block: ContentBlock | null = null;
  function load() {
    if (block !== null) {
      block.directRemove();
    }
    block = loadComments(
      content,
      () => recentCommentsCache.get(),
      COMMENTS_RECENT_SECTION,
      COMMENTS_RECENT_LOADED,
      load,
    );
  }
  load();
}

const recentMentionedCommentsCache = new AutoSingleCache<Array<CommentData>>(
  () => fetchGetRecentMentionedComments(tokenItem.getValue() ?? undefined),
  new DebugLogger('Recent Mentioned Comments Cache'),
);
export function loadRecentMentions(content: Content, token: string) {
  loadComments(
    content,
    () => recentMentionedCommentsCache.get(),
    COMMENTS_MENTION_SECTION,
    COMMENTS_MENTION_LOADED,
    () => {
      notify(COMMENTS_MENTION_REPLIED_TITLE, '', COMMENTS_MENTION_REPLIED_OK);
    },
  );
}

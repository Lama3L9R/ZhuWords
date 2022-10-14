import {
  BACKEND_ERROR_COMMENT_TOO_LONG,
  BACKEND_ERROR_COMMENT_TOO_SHORT,
  BACKEND_ERROR_EMAIL_DUPLICATED,
  BACKEND_ERROR_EMAIL_INVALID,
  BACKEND_ERROR_EMAIL_TOO_LONG,
  BACKEND_ERROR_NAME_DUPLICATED,
  BACKEND_ERROR_NAME_INVALID,
  BACKEND_ERROR_NAME_TOO_LONG,
  BACKEND_ERROR_NAME_TOO_SHORT,
  BACKEND_ERROR_TOKEN_INVALID,
  BACKEND_ERROR_UNKNOWN
} from '../constant/messages';

export const backendUrl = 'https://wtb.tepis.me';
// export const backendUrl = 'http://127.0.0.1:8088';

export enum ErrorCode {
  NAME_DUPLICATED = 1,
  EMAIL_DUPLICATED = 2,
  NAME_TOO_LONG = 3,
  EMAIL_TOO_LONG = 4,
  EMAIL_INVALID = 5,
  COMMENT_TOO_LONG = 6,
  TOKEN_INVALID = 7,
  NAME_TOO_SHORT = 8,
  COMMENT_TOO_SHORT = 9,
  NAME_INVALID = 10,
}

export function getErrorMessage(errorCode: ErrorCode): string {
  switch (errorCode) {
    case ErrorCode.NAME_DUPLICATED:
      return BACKEND_ERROR_NAME_DUPLICATED;
    case ErrorCode.EMAIL_DUPLICATED:
      return BACKEND_ERROR_EMAIL_DUPLICATED;
    case ErrorCode.NAME_TOO_LONG:
      return BACKEND_ERROR_NAME_TOO_LONG;
    case ErrorCode.EMAIL_TOO_LONG:
      return BACKEND_ERROR_EMAIL_TOO_LONG;
    case ErrorCode.EMAIL_INVALID:
      return BACKEND_ERROR_EMAIL_INVALID;
    case ErrorCode.COMMENT_TOO_LONG:
      return BACKEND_ERROR_COMMENT_TOO_LONG;
    case ErrorCode.TOKEN_INVALID:
      return BACKEND_ERROR_TOKEN_INVALID;
    case ErrorCode.NAME_TOO_SHORT:
      return BACKEND_ERROR_NAME_TOO_SHORT;
    case ErrorCode.COMMENT_TOO_SHORT:
      return BACKEND_ERROR_COMMENT_TOO_SHORT;
    case ErrorCode.NAME_INVALID:
      return BACKEND_ERROR_NAME_INVALID;
    default:
      return BACKEND_ERROR_UNKNOWN;
  }
}

export type ResultOf<T> = T extends (...[]: any) => Promise<infer U> ? U : never;
export function fetchInit(token: string): Promise<{ success: false } | {
  success: true,
  user_name: string,
  email?: string,
  display_name: string,
  mentions: number,
}> {
  return fetch(`${backendUrl}/user/init`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ token }),
  }).then(response => response.json());
}

export function fetchUpdateProfile(token: string, displayName: string, email?: string): Promise<{ success: true } | {
  success: false,
  code: ErrorCode,
}> {
  return fetch(`${backendUrl}/user/updateProfile`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ token, display_name: displayName, email }),
  }).then(response => response.json());
}

export interface CommentData {
  body: string;
  create_timestamp: number;
  update_timestamp: number;
  relative_path: string;
  id: number;
  user: {
    avatar_url: string;
    user_name: string;
    display_name: string;
  };
}

export function fetchGetChapterComments(pageName: string): Promise<Array<CommentData>> {
  return fetch(`${backendUrl}/comment/getChapter?relative_path=${pageName}`, {
    cache: 'no-cache',
    method: 'GET',
  }).then(response => response.json());
}

export function fetchGetRecentComments(): Promise<Array<CommentData>> {
  return fetch(`${backendUrl}/comment/getRecent`, {
    cache: 'no-cache',
    method: 'GET',
  }).then(response => response.json());
}

export function fetchGetRecentMentionedComments(token?: string): Promise<Array<CommentData>> {
  if (token === undefined) {
    return Promise.resolve([]);
  }
  return fetch(`${backendUrl}/comment/getRecentMentioned`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ token }),
  }).then(response => response.json());
}

export function fetchSendComment(token: string, pageName: string, content: string): Promise<{ success: true } | {
  success: false,
  code: ErrorCode,
}> {
  return fetch(`${backendUrl}/comment/send`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      token,
      relative_path: pageName,
      content,
    }),
  }).then(response => response.json());
}

export function fetchRegister(displayName: string, email?: string): Promise<{
  success: true,
  token: string,
  user_name: string,
} | {
  success: false,
  code: ErrorCode,
}> {
  return fetch(`${backendUrl}/user/register`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      display_name: displayName,
      email,
    }),
  }).then(response => response.json());
}

export function fetchDeleteComment(token: string, commentId: number): Promise<void> {
  return fetch(`${backendUrl}/comment/delete`, {
    cache: 'no-cache',
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      token,
      comment_id: commentId,
    }),
  }).then(() => undefined);
}

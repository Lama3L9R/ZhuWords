import { exec } from 'child_process';
import { basename, dirname } from 'path';
import { promisify } from 'util';
import { execAsyncWithRetry } from './execAsyncWithRetry';

export const execAsync = promisify(exec);

function getTimestamp(stdout: string) {
  const trimmed = stdout.trim();
  if (trimmed === '') {
    return undefined;
  }
  return +trimmed.substr(trimmed.lastIndexOf('\n') + 1);
}

export async function getCreationTime(path: string) {
  const cwd = dirname(path);
  const name = basename(path);
  // We first find the last merge commit that incorporates this file
  const mergeTime = getTimestamp(
    (await execAsyncWithRetry(`git log --merges --full-history --first-parent --format=%at "${name}"`, cwd)).stdout
  );
  if (mergeTime !== undefined) {
    return mergeTime;
  }
  // If such merge commit does not exist, we will simply use the file creation time
  const creationTime = getTimestamp(
    (await execAsyncWithRetry(`git log --format=%at --follow "${name}"`, cwd)).stdout
  );
  if (creationTime !== undefined) {
    return creationTime;
  }
  return 0;
}

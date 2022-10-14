export function smartThrottle(fn: () => void, timeMs: number) {
  let timerRunning = false;
  let scheduled = false;
  return () => {
    if (!timerRunning) {
      fn();
      const timedOut = () => {
        if (scheduled) {
          fn();
          scheduled = false;
          setTimeout(timedOut, timeMs);
        } else {
          timerRunning = false;
        }
      };
      timerRunning = true;
      setTimeout(timedOut, timeMs);
    } else {
      scheduled = true;
    }
  };
}

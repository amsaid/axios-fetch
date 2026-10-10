/**
 * throttle - Throttle decorator.
 *
 * Ported from `axios/lib/helpers/throttle.js`. Returns `[throttled, flush]`
 * so callers can force the pending invocation (used by progress events).
 */
'use strict';

module.exports = function throttle(fn, freq) {
  let timestamp = 0;
  const threshold = 1000 / freq;
  let lastArgs;
  let timer;

  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };

  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };

  const flush = () => lastArgs && invoke(lastArgs);

  return [throttled, flush];
};

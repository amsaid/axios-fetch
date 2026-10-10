/**
 * composeSignals - Merge `config.signal`, `config.cancelToken` and
 * `config.timeout` into a single AbortSignal.
 *
 * This fixes a bug where providing a `signal` silently disabled `timeout`.
 * Ported from `axios/lib/helpers/composeSignals.js`.
 */
'use strict';

const CanceledError = require('../core/CanceledError');
const AxiosError = require('../core/AxiosError');
const { asap } = require('./utils');

/**
 * @param {Array<AbortSignal|undefined>} signals
 * @param {number|undefined} timeout
 * @returns {AbortSignal|undefined}
 */
module.exports = function composeSignals(signals, timeout) {
  signals = signals ? signals.filter(Boolean) : [];
  const { length } = signals;

  if (timeout || length) {
    const controller = new AbortController();

    let aborted;

    const onabort = function (reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError ? err
          : new CanceledError(err instanceof Error ? err.message : err));
      }
    };

    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT));
    }, timeout);

    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal) => {
          signal.unsubscribe
            ? signal.unsubscribe(onabort)
            : signal.removeEventListener('abort', onabort);
        });
        signals = null;
      }
    };

    signals.forEach((signal) => signal.addEventListener('abort', onabort));

    const { signal } = controller;

    signal.unsubscribe = () => asap(unsubscribe);

    return signal;
  }
};

/**
 * CancelToken - Imperative cancellation token (Axios pre-v0.22 API).
 *
 * Provides `new CancelToken(executor)` where executor receives a
 * `cancel(message)` function and a `reason` getter.
 */
'use strict';

const CanceledError = require('./CanceledError');

class CancelToken {
  constructor(executor) {
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(function (cancel) {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    if (typeof executor === 'function') {
      executor(function cancel(message, config, request) {
        if (token.reason) return;             // already cancelled
        token.reason = new CanceledError(message, config, request);
        resolvePromise(token.reason);
      });
    }
  }

  /**
   * Subscribe to cancellation.
   * @param {Function} listener - Called with the CanceledError.
   * @throws if already cancelled.
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Throw if this token is already cancelled.
   * Instance method (matches Axios API: token.throwIfRequested()).
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Static: throw if token is already cancelled.
   * @param {CancelToken} token
   */
  static throwIfRequested(token) {
    if (token && token.reason) {
      throw token.reason;
    }
  }

  /**
   * Return a source object with a `token` and an `abort` function,
   * mirroring `CancelToken.source()` from Axios.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return { token, cancel };
  }
}

module.exports = CancelToken;

/**
 * CancelToken - Imperative cancellation token (Axios pre-v0.22 API).
 *
 * Ported from `axios/lib/cancel/CancelToken.js`: `subscribe()` now returns an
 * unsubscribe function and `toAbortSignal()` bridges it to AbortController.
 */
'use strict';

const CanceledError = require('./CanceledError');

class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    this.promise.then(function onCancel(cancel) {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // allow `.then()` consumers to opt out via `promise.cancel()`
    this.promise.then = function (onfulfilled) {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal.
   * @returns {Function} unsubscribe callback
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return function () {};
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }

    return this.unsubscribe.bind(this);
  }

  /**
   * Remove a previously registered listener.
   */
  unsubscribe(listener) {
    if (!this._listeners) return;

    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Bridge this CancelToken to an AbortSignal so it can be composed with
   * `config.signal` and `config.timeout`.
   */
  toAbortSignal() {
    const controller = new AbortController();

    const abort = (err) => {
      controller.abort(err);
    };

    this.subscribe(abort);

    controller.signal.unsubscribe = () => this.unsubscribe(abort);

    return controller.signal;
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that,
   * when called, cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return { token, cancel };
  }

  /**
   * Throw if the given token has already been cancelled.
   */
  static throwIfRequested(token) {
    if (token && token.reason) {
      throw token.reason;
    }
  }
}

module.exports = CancelToken;

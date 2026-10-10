/**
 * InterceptorManager - Manages request & response interceptor stacks.
 *
 * Mirrors the Axios InterceptorManager interface exactly, including the
 * `{ synchronous, runWhen }` options supported by Axios >= 1.x:
 *
 *   - use(fulfilled, rejected, options) → id
 *   - eject(id)
 *   - forEach(fn)                       → iterate registered handlers
 *   - clear()
 */
'use strict';

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack.
   *
   * @param {Function} [fulfilled] - Fulfilled handler.
   * @param {Function} [rejected]  - Rejected handler.
   * @param {Object}   [options]
   * @param {boolean}  [options.synchronous=false] Run the interceptor outside
   *        of the promise chain (must return the config, not a promise).
   * @param {Function} [options.runWhen] Only run when it returns true.
   * @returns {number} Numeric ID that can be passed to eject().
   */
  use(fulfilled, rejected, options) {
    if (typeof fulfilled !== 'function') {
      throw new TypeError('Interceptor resolved must be a function');
    }
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: !!(options && options.synchronous),
      runWhen: options ? options.runWhen : null,
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor by its ID.
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;           // Axios uses null to preserve indices
    }
  }

  /**
   * Iterate over all active (non-ejected) handlers.
   */
  forEach(fn) {
    this.handlers.forEach((h) => {
      if (h !== null) fn(h);
    });
  }

  /**
   * Remove all interceptors.
   */
  clear() {
    if (this.handlers.length > 0) {
      this.handlers = [];
    }
  }
}

module.exports = InterceptorManager;

/**
 * InterceptorManager - Manages request & response interceptor stacks.
 *
 * Mirrors the Axios InterceptorManager interface exactly:
 *   - use(resolved, rejected) → id
 *   - eject(id)
 *   - forEach(fn)            → iterate over registered handlers
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
   * @param {Function} resolved - Fulfulled handler  (request)fn(config) / (response)fn(response).
   * @param {Function} [rejected] - Rejected handler.
   * @returns {number} Numeric ID that can be passed to eject().
   */
  use(resolved, rejected) {
    if (typeof resolved !== 'function') {
      throw new TypeError('Interceptor resolved must be a function');
    }
    this.handlers.push({ resolved, rejected });
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
   * Axios calls this internally; useful for introspection.
   *
   * @param {Function} fn - Called with each handler: fn(handler)
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

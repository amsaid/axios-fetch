/**
 * AxiosError - Drop-in compatible error class matching Axios error structure
 */
'use strict';

/**
 * Creates an AxiosError that mirrors the official Axios error interface.
 *
 * @param {string|null} message        - Human-readable error message.
 * @param {string}      code           - Machine-readable error code (e.g. 'ERR_NETWORK').
 * @param {Object}      config         - The request config that caused the error.
 * @param {Object|null} request        - The underlying request object (Request instance or XMLHttpRequest).
 * @param {Object|null} response       - The response received (if any) before the error.
 */
class AxiosError extends Error {
  constructor(message, code, config, request, response) {
    super(message);

    this.name = 'AxiosError';
    this.code = code;
    this.config = config;
    this.request = request;
    this.response = response;

    // Maintain stack trace from the original error if present
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convenience factory: create a network / connection error.
   */
  static fromError(error, config, request, response) {
    const axiosError = new AxiosError(
      error.message,
      'ERR_NETWORK',
      config,
      request,
      response
    );
    axiosError.cause = error;
    return axiosError;
  }

  /**
   * Create a timeout error.
   */
  static timeout(config, request) {
    const message = config?.timeoutErrorMessage || `timeout of ${config?.timeout}ms exceeded`;
    return new AxiosError(message, 'ECONNABORTED', config, request, null);
  }

  /**
   * Create a cancel error.
   */
  static cancel(message, config, request) {
    return new AxiosError(message, 'ERR_CANCELED', config, request, null);
  }

  /**
   * Create an error for a non-2xx response.
   */
  static badStatus(status, statusText, config, request, response) {
    const message = `Request failed with status code ${status}`;
    return new AxiosError(message, 'ERR_BAD_REQUEST', config, request, response);
  }

  /**
   * Create a request configuration error.
   */
  static badConfig(message, config) {
    return new AxiosError(message, 'ERR_BAD_OPTION', config, null, null);
  }

  // ---------- static helpers matching Axios patterns ----------

  /**
   * axios.isCancel()-compatible guard.
   * Uses the `__CANCEL__` flag convention.
   */
  static isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  /**
   * axios.isAxiosError()-compatible guard.
   */
  static isAxiosError(payload) {
    return payload instanceof AxiosError;
  }

  /**
   * Convert the error to a plain JSON-serialisable object (matches Axios toJSON).
   */
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      code: this.code,
      config: this.config,
      request: this._requestToJSON(this.request),
      response: this._responseToJSON(this.response),
      stack: this.stack,
    };
  }

  _requestToJSON(req) {
    if (!req) return null;
    if (typeof Request !== 'undefined' && req instanceof Request) {
      return { method: req.method, url: req.url };
    }
    return req;
  }

  _responseToJSON(res) {
    if (!res) return null;
    return {
      data: res.data,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers?.toJSON?.() ?? res.headers,
      config: res.config,
      request: this._requestToJSON(res.request),
    };
  }
}

module.exports = AxiosError;

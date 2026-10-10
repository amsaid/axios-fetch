/**
 * AxiosError - Drop-in compatible error class matching Axios error structure.
 *
 * Ported from `axios/lib/core/AxiosError.js` (1.7.x) including the error code
 * constants, the `isAxiosError` marker and the `status` field.
 */
'use strict';

const { toJSONObject } = require('../helpers/utils');

/**
 * Create an Error with the specified message, config, error code, request and
 * response.
 */
class AxiosError extends Error {
  constructor(message, code, config, request, response) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }

    this.message = message;
    this.name = 'AxiosError';

    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);

    if (response) {
      this.response = response;
      this.status = response.status ? response.status : null;
    }
  }

  /**
   * `axios.AxiosError.from(error, code, config, request, response)`
   * Copies own properties of the source error (minus `isAxiosError`).
   */
  static from(error, code, config, request, response, customProps) {
    const axiosError = new AxiosError(
      error && error.message, code, config, request, response,
    );

    if (error && typeof error === 'object') {
      for (const key of Object.keys(error)) {
        if (key === 'isAxiosError' || key === 'message' || key === 'name' ||
          key === 'config' || key === 'request' || key === 'response') {
          continue;
        }
        if (axiosError[key] === undefined) {
          try {
            axiosError[key] = error[key];
          } catch (_e) { /* read-only property */ }
        }
      }
    }

    if (code === undefined && error && error.code !== undefined) {
      axiosError.code = error.code;
    }

    axiosError.cause = error;

    customProps && Object.assign(axiosError, customProps);

    return axiosError;
  }

  /**
   * Create a timeout error. `transitional.clarifyTimeoutError` selects between
   * `ECONNABORTED` and `ETIMEDOUT` exactly like Axios.
   */
  static timeout(config, request, message) {
    const transitional = config && config.transitional;
    const clarify = transitional && transitional.clarifyTimeoutError;
    const msg = message || config.timeoutErrorMessage ||
      `timeout of ${config.timeout}ms exceeded`;

    return new AxiosError(msg, clarify ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED, config, request);
  }

  toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: toJSONObject(this.config),
      code: this.code,
      status: this.status,
    };
  }

  // ---------- static helpers matching Axios patterns ----------

  /** @deprecated axios >= 1.x uses CanceledError */
  static cancel(message, config, request) {
    const CanceledError = require('./CanceledError');
    return new CanceledError(message, config, request);
  }

  /**
   * Convenience factory: wrap a generic error as a network error.
   * (`AxiosError.from(error, config, request, response)`)
   */
  static fromError(error, config, request, response, code) {
    return AxiosError.from(error, code || AxiosError.ERR_NETWORK, config, request, response);
  }

  /**
   * Create an error for a non-2xx response (used by settle()).
   */
  static badStatus(status, statusText, config, request, response) {
    const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(status / 100) - 4];
    return new AxiosError(`Request failed with status code ${status}`, code, config, request, response);
  }

  /**
   * Create a request configuration error.
   */
  static badConfig(message, config) {
    return new AxiosError(message, AxiosError.ERR_BAD_OPTION, config, null, null);
  }

  static isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  static isAxiosError(payload) {
    return payload instanceof AxiosError;
  }
}

const prototype = AxiosError.prototype;

Object.defineProperty(prototype, 'isAxiosError', { value: true });

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED',
  'ERR_NOT_SUPPORT',
  'ERR_INVALID_URL',
].forEach((code) => {
  Object.defineProperty(AxiosError, code, { value: code });
});

Object.defineProperties(AxiosError, {
  from: { value: AxiosError.from, writable: false },
  isCancel: { value: AxiosError.isCancel, writable: false },
  isAxiosError: { value: AxiosError.isAxiosError, writable: false },
  timeout: { value: AxiosError.timeout, writable: false },
  cancel: { value: AxiosError.cancel, writable: false },
});

module.exports = AxiosError;

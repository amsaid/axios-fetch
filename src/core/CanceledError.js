/**
 * CanceledError - Dedicated class for aborted / cancelled requests.
 *
 * Axios >= 0.22 exposes `axios.CanceledError` (previously just AxiosError).
 * This class extends AxiosError with a `__CANCEL__` flag so that
 * `axios.isCancel(error)` returns true.
 */
'use strict';

const AxiosError = require('./AxiosError');

class CanceledError extends AxiosError {
  constructor(message, config, request) {
    super(
      message || 'canceled',
      'ERR_CANCELED',
      config,
      request
    );
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

module.exports = CanceledError;

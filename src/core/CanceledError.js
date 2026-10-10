/**
 * CanceledError - Dedicated class for aborted / cancelled requests.
 *
 * Axios >= 0.22 exposes `axios.CanceledError` (aliased as `axios.Cancel`).
 * It extends AxiosError with a `__CANCEL__` flag so `axios.isCancel(error)`
 * returns true.
 */
'use strict';

const AxiosError = require('./AxiosError');

class CanceledError extends AxiosError {
  constructor(message, config, request) {
    super(message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

module.exports = CanceledError;

/**
 * dispatchRequest - Runs the transform pipeline around the adapter.
 *
 * Ported from `axios/lib/core/dispatchRequest.js`. Keeping this separate from
 * `Axios#_request` means request interceptors see the *raw* config while the
 * adapter always receives a fully transformed one, and response/error
 * transforms are applied on both the resolve and reject paths.
 */
'use strict';

const transformData = require('./transformData');
const defaults = require('./defaults');
const AxiosHeaders = require('./AxiosHeaders');
const CanceledError = require('./CanceledError');
const AxiosError = require('./AxiosError');
const fetchAdapter = require('../adapters/fetch');

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

async function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders.from(config.headers);

  // Transform request data (may be async)
  config.data = await transformData.call(config, config.transformRequest);

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = fetchAdapter;

  try {
    const response = await adapter(config);

    throwIfCancellationRequested(config);

    response.data = await transformData.call(config, config.transformResponse, response);
    response.headers = AxiosHeaders.from(response.headers);

    return response;
  } catch (reason) {
    if (!AxiosError.isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform the error response too, so `error.response.data` is parsed
      if (reason && reason.response) {
        reason.response.data = await transformData.call(config, config.transformResponse, reason.response);
        reason.response.headers = AxiosHeaders.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  }
}

dispatchRequest.defaults = defaults;

module.exports = dispatchRequest;

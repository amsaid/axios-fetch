/**
 * settle - Resolve or reject a promise based on validateStatus.
 *
 * Matches the Axios settle helper (4xx → ERR_BAD_REQUEST, 5xx → ERR_BAD_RESPONSE).
 */
'use strict';

const AxiosError = require('./AxiosError');

/**
 * Resolve or reject based on validateStatus(config)(status).
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @param {Object}   response - The fully-constructed AxiosResponse.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(AxiosError.badStatus(
      response.status,
      response.statusText,
      response.config,
      response.request,
      response,
    ));
  }
}

module.exports = settle;

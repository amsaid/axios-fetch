/**
 * settle - Resolve or reject a promise based on validateStatus.
 *
 * Matches the Axios settle helper interface exactly.
 */
'use strict';

const AxiosError = require('./AxiosError');

/**
 * Resolve or reject based on validateStatus(config)(status).
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @param {Object}   response - The fully-constructed AxiosResponse.
 * @param {Object}   config
 */
function settle(resolve, reject, response, config) {
  const validateStatus = config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(
      AxiosError.badStatus(
        response.status,
        response.statusText,
        config,
        response.request,
        response
      )
    );
  }
}

module.exports = settle;

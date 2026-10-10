/**
 * transformData - Apply transformRequest / transformResponse chains.
 *
 * Ported from `axios/lib/core/transformData.js`. Transformers are invoked
 * with the config as `this`, receive `(data, headers, status)` and may return
 * a Promise (async transforms are supported since Axios 1.x).
 */
'use strict';

const defaults = require('./defaults');
const AxiosHeaders = require('./AxiosHeaders');
const { forEach } = require('../helpers/utils');

/**
 * @param {Function[]} fns         - The transform chain.
 * @param {Object}     [response]  - A response (transformResponse) or the
 *                                    config itself (transformRequest).
 * @returns {*} The transformed data — a Promise when any transform is async.
 */
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders.from(context.headers);
  let data = context.data;

  forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  return data;
}

module.exports = transformData;

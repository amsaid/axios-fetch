/**
 * mergeConfig - Merge Axios request configs.
 *
 * Ported from `axios/lib/core/mergeConfig.js` (1.7.x).
 *
 * Key differences from the previous implementation of this library:
 *   1. DEFAULTS are **not** injected — only the supplied configs are merged
 *      (`axios.mergeConfig(a, b)` behaves like Axios).
 *   2. `transformRequest` / `transformResponse` are **replaced**, not
 *      concatenated (this fixes the default transform running 2-3× per request).
 *   3. `url`, `method`, `data`, `responseType` and `adapter` are taken from
 *      config2 only (never inherited from instance defaults).
 *   4. Everything else deep-merges plain objects.
 *
 * `mergeConfig` is variadic: `mergeConfig(a, b, c)` folds left.
 */
'use strict';

const defaults = require('./defaults');
const AxiosHeaders = require('./AxiosHeaders');
const { isArray, isPlainObject, isUndefined, merge } = require('../helpers/utils');

const headersToObject = (thing) => (thing instanceof AxiosHeaders ? { ...thing } : thing);

function mergeConfig(config1, ...rest) {
  if (rest.length === 0) {
    return config1;
  }

  // eslint-disable-next-line no-param-reassign
  config1 = config1 || {};
  // eslint-disable-next-line no-param-reassign
  let config2 = rest[0] || {};

  if (rest.length > 1) {
    config2 = rest.reduce((acc, cfg) => mergeConfig(acc, cfg), config2);
  }

  const config = {};

  function getMergedValue(target, source, caseless) {
    if (isPlainObject(target) && isPlainObject(source)) {
      return merge.call({ caseless }, target, source);
    } else if (isPlainObject(source)) {
      return merge.call({ caseless }, {}, source);
    } else if (isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(a, b, caseless) {
    if (!isUndefined(b)) {
      return getMergedValue(a, b, caseless);
    } else if (!isUndefined(a)) {
      return getMergedValue(undefined, a, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }

  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutErrorMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true),
  };

  for (const prop of Object.keys(Object.assign({}, config1, config2))) {
    const mergeFn = mergeMap[prop] || mergeDeepProperties;
    const configValue = mergeFn(config1[prop], config2[prop], prop);

    (isUndefined(configValue) && mergeFn !== mergeDirectKeys) || (config[prop] = configValue);
  }

  return config;
}

// Parity with `axios.defaults` — the defaults object is exposed for reference.
mergeConfig.defaults = defaults;
mergeConfig.DEFAULTS = defaults;

module.exports = mergeConfig;

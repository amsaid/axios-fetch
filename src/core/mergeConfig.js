/**
 * mergeConfig - Deep-merge Axios request configs.
 *
 * Defaults ← config1 ← config2   (later values win).
 * Matches Axios merge behaviour for every known key.
 */
'use strict';

const { forEach, isPlainObject, deepMerge } = require('../helpers/utils');

/**
 * Keys whose values should be deeply merged (plain objects only).
 * NOTE: 'headers' is NOT deep-merged — it has special Axios-style handling
 * via mergeHeaders() which preserves common/method-specific/direct structure.
 */
const DEEP_MERGE_KEYS = [
  'params',
];

/**
 * Keys whose values should be concatenated (arrays).
 */
const CONCAT_KEYS = [
  'transformRequest',
  'transformResponse',
];

const DEFAULTS = {
  method: 'get',
  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  maxBodyLength: -1,
  maxRedirects: 5,
  validateStatus(status) {
    return status >= 200 && status < 300;
  },
  transformRequest: [
    function transformRequest(data, headers) {
      if (isPlainObject(data) || Array.isArray(data)) {
        // Only auto-set content-type if not already set
        const ct = headers && (
          headers['Content-Type'] || headers['content-type']
        );
        if (!ct || ct.indexOf('application/json') === 0) {
          headers['Content-Type'] = 'application/json';
        }
        return JSON.stringify(data);
      }
      return data;
    },
  ],
  transformResponse: [
    function transformResponse(data) {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_e) { /* not json */ }
      }
      return data;
    },
  ],
  responseType: 'json',
  responseEncoding: 'utf8',
  headers: {
    common: {
      Accept: 'application/json, text/plain, */*',
    },
  },
};

function defaultTo(value, fallback) {
  return value !== undefined ? value : fallback;
}

/**
 * Merge a series of config objects, later ones taking precedence.
 *
 * @param {...Object} configs - Config objects to merge (left to right).
 * @returns {Object} Merged config.
 */
function mergeConfig(...configs) {
  let result = {};

  // Start from defaults
  result = applyTo(result, DEFAULTS);

  for (const cfg of configs) {
    if (!cfg) continue;
    result = applyTo(result, cfg);
  }

  return result;
}

/**
 * Apply a source config onto a target, respecting key-specific merge rules.
 */
function applyTo(target, source) {
  if (!isPlainObject(source)) return target;

  const result = { ...target };

  // ---- headers need special handling (common + per-method flattening) ----
  if (source.headers) {
    result.headers = mergeHeaders(result.headers, source.headers);
  }

  for (const key of Object.keys(source)) {
    if (key === 'headers') continue;           // already handled above

    if (CONCAT_KEYS.includes(key)) {
      // Concatenate arrays
      const base = Array.isArray(result[key]) ? result[key] : [];
      const src  = Array.isArray(source[key]) ? source[key] : (source[key] != null ? [source[key]] : []);
      result[key] = base.concat(src);
    } else if (DEEP_MERGE_KEYS.includes(key)) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      // Direct overwrite
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Axios-style header merging.
 * Preserves the Axios header structure:
 *   { common: {...}, get: {...}, post: {...}, 'X-Custom': 'value' }
 *
 * - `common` keys are baseline
 * - Method-specific keys override
 * - Instance-level keys override everything
 */
function mergeHeaders(target, source) {
  const result = {};
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'purge', 'link', 'unlink'];

  // 1. Merge 'common' headers
  result.common = {};
  if (target && target.common) Object.assign(result.common, target.common);
  if (source && source.common) Object.assign(result.common, source.common);

  // 2. Merge method-specific headers
  for (const method of HTTP_METHODS) {
    if ((target && target[method]) || (source && source[method])) {
      result[method] = {};
      if (target && target[method]) Object.assign(result[method], target[method]);
      if (source && source[method]) Object.assign(result[method], source[method]);
    }
  }

  // 3. Copy non-common, non-method keys from target (instance defaults)
  if (target) {
    forEach(target, (val, key) => {
      if (key !== 'common' && !HTTP_METHODS.includes(key.toLowerCase())) {
        result[key] = val;
      }
    });
  }

  // 4. Apply source direct keys (per-request headers override)
  if (source) {
    forEach(source, (val, key) => {
      if (key !== 'common' && !HTTP_METHODS.includes(key.toLowerCase())) {
        result[key] = val;
      }
    });
  }

  return result;
}

function isHttpMethod(key) {
  return ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'purge', 'link', 'unlink'].includes(key.toLowerCase());
}

mergeConfig.DEFAULTS = DEFAULTS;

module.exports = mergeConfig;

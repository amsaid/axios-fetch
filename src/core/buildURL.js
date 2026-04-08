/**
 * buildURL, combineURLs, isURLSameOrigin — all matching
 * Axios helper behaviour so that interceptors & defaults feel native.
 */
'use strict';

const { forEach, isURLSearchParams, trim } = require('../helpers/utils');

/**
 * Build a full URL by appending serialized params to baseURL + url.
 *
 * @param {string}      url
 * @param {Object|null} params
 * @param {Function}    [paramsSerializer] - Custom serializer (must return string).
 * @returns {string}
 */
function buildURL(url, params, paramsSerializer) {
  if (!params) return url;

  let serializedParams;

  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    const parts = [];

    forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') return;

      if (Array.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      forEach(val, function serializeValue(v) {
        if (isDate(v)) {
          v = v.toISOString();
        } else if (isPlainObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

/**
 * Combine a baseURL and a request URL (mirrors Axios combineURLs).
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * Check if the URL has the same origin as the current page.
 * Falls back to true in Node / environments without location.
 */
function isURLSameOrigin(requestURL) {
  if (typeof location === 'undefined') return true;
  try {
    const parsed = new URL(requestURL);
    return parsed.origin === location.origin;
  } catch (_e) {
    return true;
  }
}

// --- internal helpers ---

function encode(str) {
  return encodeURIComponent(str)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}

function isDate(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime());
}

function isPlainObject(val) {
  if (typeof val !== 'object' || val === null) return false;
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

module.exports = {
  buildURL,
  combineURLs,
  isURLSameOrigin,
};

/**
 * buildURL / combineURLs / buildFullPath / isURLSameOrigin — matching the
 * Axios helpers so URLs, params and interceptors behave natively.
 */
'use strict';

const AxiosURLSearchParams = require('./AxiosURLSearchParams');
const { isURLSearchParams, isString } = require('../helpers/utils');

/**
 * Default encoder: replaces `:`, `$`, `,`, `+`, `[` and `]` with their
 * (partially) URI-encoded counterparts — identical to Axios.
 */
function encode(val) {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending serialized params to the end.
 *
 * @param {string} url
 * @param {object} [params]
 * @param {?object|Function} [options] `{encode, serialize, indexes}` or a
 *        bare serialize function (legacy axios form).
 * @returns {string}
 */
function buildURL(url, params, options) {
  if (!params) return url;

  // axios accepts both `paramsSerializer: fn` and `paramsSerializer: {serialize}`
  if (isString(options) || typeof options === 'function') {
    options = { serialize: options };
  }

  const _encode = (options && options.encode) || encode;
  const serializeFn = options && options.serialize;

  let serializedParams;

  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = isURLSearchParams(params)
      ? params.toString()
      : new AxiosURLSearchParams(params, options).toString(_encode);
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
 * Combines the baseURL with the requestedURL *only* when the requestedURL is
 * not already absolute. Fixes `baseURL + 'https://other.host/x'` mangling.
 */
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(String(url));
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

module.exports = {
  buildURL,
  combineURLs,
  buildFullPath,
  isURLSameOrigin,
  isAbsoluteURL,
};

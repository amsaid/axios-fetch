/**
 * AxiosURLSearchParams - Params serializer used by `buildURL`.
 *
 * Ported from `axios/lib/helpers/AxiosURLSearchParams.js`. It reuses
 * `toFormData` so nested objects / arrays / dates render exactly like Axios.
 */
'use strict';

const toFormData = require('../helpers/toFormData');

/**
 * Encodes a string by replacing every char outside the unreserved set with
 * its percent-encoded equivalent.
 */
function encode(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00',
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, (match) => charMap[match]);
}

function AxiosURLSearchParams(params, options) {
  this._pairs = [];

  params && toFormData(params, this, options);
}

AxiosURLSearchParams.prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};

AxiosURLSearchParams.prototype.toString = function toStringFn(encoder) {
  const _encode = encoder ? function (value) {
    return encoder.call(this, value, encode);
  } : encode;

  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + '=' + _encode(pair[1]);
  }, '').join('&');
};

module.exports = AxiosURLSearchParams;
module.exports.encode = encode;

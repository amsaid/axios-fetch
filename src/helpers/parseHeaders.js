/**
 * parseHeaders - Parse a raw header string into a plain object.
 *
 * Ported from `axios/lib/helpers/parseHeaders.js`.
 * Duplicate `Set-Cookie` values are preserved as arrays.
 */
'use strict';

const IGNORE_DUPLICATE_OF = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent',
];

module.exports = function parseHeaders(rawHeaders) {
  const parsed = {};
  let i;

  rawHeaders && String(rawHeaders).split('\n').forEach(function parser(line) {
    i = line.indexOf(':');
    const key = line.substring(0, i).trim().toLowerCase();
    const val = line.substring(i + 1).trim();

    if (!key || (parsed[key] && IGNORE_DUPLICATE_OF.indexOf(key) !== -1)) {
      return;
    }

    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

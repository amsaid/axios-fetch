/**
 * defaults - The Axios default configuration, ported from
 * `axios/lib/defaults/index.js` and `axios/lib/defaults/transitional.js`.
 */
'use strict';

const AxiosError = require('./AxiosError');
const toFormData = require('../helpers/toFormData');
const formDataToJSON = require('../helpers/formDataToJSON');
const {
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isBuffer,
  isFile,
  isFileList,
  isFormData,
  isHTMLForm,
  isObject,
  isReadableStream,
  isStream,
  isString,
  isURLSearchParams,
} = require('../helpers/utils');

const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
};

/**
 * Parse a string as JSON; on failure return the string unchanged.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return rawValue.trim ? rawValue.trim() : rawValue;
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

/**
 * `application/x-www-form-urlencoded` serialisation of a plain object.
 */
function toURLEncodedForm(data) {
  const parts = [];
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v)));
    } else {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return parts.join('&');
}

const defaults = {
  transitional: transitionalDefaults,

  adapter: ['fetch'],

  transformRequest: [function transformRequest(data, headers) {
    const contentType = (headers && headers.getContentType && headers.getContentType()) || '';
    const hasJSONContentType = contentType.indexOf('application/json') > -1;
    const isObjectPayload = isObject(data);

    if (isObjectPayload && isHTMLForm(data)) {
      data = new FormData(data);
    }

    const isFormData_ = isFormData(data);

    if (isFormData_) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }

    if (isArrayBuffer(data) || isBuffer(data) || isStream(data) || isFile(data) || isBlob(data) || isReadableStream(data)) {
      return data;
    }

    if (isArrayBufferView(data)) {
      // Return only this view's bytes. A Node Buffer is often a window into a
      // larger pooled ArrayBuffer, so `data.buffer` alone would leak the pool.
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }

    if (isURLSearchParams(data)) {
      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
      return data.toString();
    }

    let isFileList_;

    if (isObjectPayload) {
      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        return toURLEncodedForm(data);
      }

      if ((isFileList_ = isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData(
          isFileList_ ? { 'files[]': data } : data,
          _FormData && new _FormData(),
          this.formSerializer,
        );
      }
    }

    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType('application/json', false);
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === 'json';

    if (isReadableStream(data)) {
      return data;
    }

    if (data && isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;

      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  // This library defaults to `json` (upstream axios leaves this undefined and
  // relies on `transitional.forcedJSONParsing`). Behaviour is identical.
  responseType: 'json',
  responseEncoding: 'utf8',

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: typeof FormData !== 'undefined' ? FormData : null,
    Blob: typeof Blob !== 'undefined' ? Blob : null,
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': undefined,
    },
  },
};

['delete', 'get', 'head', 'post', 'put', 'patch'].forEach((method) => {
  defaults.headers[method] = {};
});

module.exports = defaults;

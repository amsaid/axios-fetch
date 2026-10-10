/**
 * toFormData - Convert an arbitrary object into a FormData instance.
 *
 * Ported from `axios/lib/helpers/toFormData.js` (nested keys rendered as
 * `a[b][c]`, `{}` meta-tokens, `[]` array markers, Blob support).
 */
'use strict';

const AxiosError = require('../core/AxiosError');
const {
  forEach,
  isArray,
  isDate,
  isBlob,
  isFileList,
  isFunction,
  isPlainObject,
  isSpecCompliantForm,
  isTypedArray,
  isArrayBuffer,
  isString,
  isUndefined,
  endsWith,
} = require('./utils');

/**
 * Removes the brackets from the end of a string
 */
function removeBrackets(key) {
  return endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * Converts a flat list with keys into a hierarchy based identifier.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? '[' + token + ']' : token;
  }).join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 */
function isFlatArray(arr) {
  return isArray(arr) && !arr.some(isVisitable);
}

function isVisitable(thing) {
  return isPlainObject(thing) || isArray(thing);
}

/**
 * Convert a data object to FormData
 *
 * @param {Object|Array} obj The data object to convert to a form data.
 * @param {?FormData} formData The FormData object to append to.
 * @param {?Object} [options]
 * @param {?Function} [options.visitor] Method to convert the value of a key.
 * @param {?boolean} [options.metaTokens=true] Use MetaTokens to indicate field aliases.
 * @param {?boolean} [options.dots=false] Render field names with dot notation.
 * @param {?boolean} [options.indexes=false] Append indexes to field names when value is an array.
 * @returns {FormData}
 */
function toFormData(obj, formData, options) {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('target must be an object');
  }

  if (typeof FormData === 'undefined') {
    throw new Error('FormData is not supported in this environment');
  }

  formData = formData || new FormData();

  const metaTokens = options && options.metaTokens !== undefined ? options.metaTokens : true;
  const dots = options && options.dots !== undefined ? options.dots : false;
  const indexes = options && options.indexes !== undefined ? options.indexes : false;
  const _Blob = (options && options.Blob) || (typeof Blob !== 'undefined' && Blob);
  const useBlob = _Blob && isSpecCompliantForm(formData);

  const visitor = (options && options.visitor) || defaultVisitor;

  if (!isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }

  function convertValue(value) {
    if (value === null) return '';

    if (isDate(value)) {
      return value.toISOString();
    }

    if (!useBlob && isBlob(value)) {
      throw new AxiosError('Blob is not supported. Use a Buffer instead.');
    }

    if (isArrayBuffer(value) || isTypedArray(value)) {
      return useBlob && typeof Blob === 'function' ? new Blob([value]) : value;
    }

    return value;
  }

  /**
   * Default visitor: renders keys the same way Axios does.
   */
  function defaultVisitor(value, key, path) {
    let arr = value;

    if (value && !path && typeof value === 'object') {
      if (endsWith(key, '{}')) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (
        (isArray(value) && isFlatArray(value)) ||
        ((isFileList(value) || endsWith(key, '[]')) && (arr = Array.from(value)))
      ) {
        key = removeBrackets(key);

        arr.forEach(function each(el, index) {
          !(isUndefined(el) || el === null) && formData.append(
            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
            convertValue(el),
          );
        });
        return false;
      }
    }

    if (isVisitable(value)) {
      return true;
    }

    formData.append(renderKey(path, key, dots), convertValue(value));

    return false;
  }

  const stack = [];

  function build(value, path) {
    if (isUndefined(value)) return;

    if (stack.indexOf(value) !== -1) {
      throw Error('Circular reference detected in ' + path.join('.'));
    }

    stack.push(value);

    forEach(value, function each(el, key) {
      const result = !(isUndefined(el) || el === null) && visitor.call(
        formData, el, isString(key) ? key.trim() : key, path,
      );

      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });

    stack.pop();
  }

  build(obj);

  return formData;
}

module.exports = toFormData;

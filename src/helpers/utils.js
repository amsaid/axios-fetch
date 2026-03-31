/**
 * Utility helpers used throughout the library.
 * Extracted so every module imports from a single source of truth.
 */
'use strict';

/**
 * Iterate over own enumerable string-keyed properties of an object.
 * Works with Array-Like objects too (e.g. Headers).
 */
function forEach(obj, fn) {
  if (obj === null || typeof obj === 'undefined') return;

  if (typeof obj !== 'object') {
    obj = [obj];          // wrap primitives
  }

  if (Array.isArray(obj)) {
    for (let i = 0, len = obj.length; i < len; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    const keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

function isPlainObject(val) {
  if (typeof val !== 'object' || val === null) return false;
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

function isArrayBuffer(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object ArrayBuffer]';
}

function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

function isBlob(val) {
  return (typeof Blob !== 'undefined') && (val instanceof Blob);
}

function isFile(val) {
  return (typeof File !== 'undefined') && (val instanceof File);
}

function isStream(val) {
  return isPlainObject(val) && typeof val.pipe === 'function';
}

function isURLSearchParams(val) {
  return (typeof URLSearchParams !== 'undefined') && (val instanceof URLSearchParams);
}

function isString(val) {
  return typeof val === 'string';
}

function isFunction(val) {
  return typeof val === 'function';
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

function trim(str) {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

function deepMerge(/* ...objects */) {
  const result = {};
  assignValue(result, arguments[0]);
  for (let i = 1; i < arguments.length; i++) {
    assignValue(result, arguments[i]);
  }
  return result;
}

function assignValue(target, source) {
  if (!source) return;
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (isPlainObject(srcVal)) {
      target[key] = deepMerge(target[key], srcVal);
    } else {
      target[key] = srcVal;
    }
  }
}

/**
 * Strip anything that isn't a direct own property (used for JSON).
 */
function stripUndefinedKeys(obj) {
  if (!isPlainObject(obj)) return obj;
  const out = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

module.exports = {
  forEach,
  isPlainObject,
  isArrayBuffer,
  isFormData,
  isBlob,
  isFile,
  isStream,
  isURLSearchParams,
  isString,
  isFunction,
  isUndefined,
  trim,
  deepMerge,
  stripUndefinedKeys,
};

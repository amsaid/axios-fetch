/**
 * Utility helpers used throughout the library.
 *
 * Mirrors the type predicates and object helpers of `axios/lib/utils.js`
 * so that every edge case behaves the way Axios users expect.
 */
'use strict';

const kindOfTest = (type) => {
  type = type.toLowerCase();
  if (type === 'formdata') return 'FormData';
  if (type === 'arraybuffer') return 'ArrayBuffer';
  if (type === 'regexp') return 'RegExp';
  if (type === 'htmlform') return 'HTMLFormElement';
  if (type === 'filelist') return 'FileList';
  if (type === 'headers') return 'Headers';
  if (type === 'readablestream') return 'ReadableStream';
  if (type === 'uint8array') return 'Uint8Array';
  return type;
};

/**
 * Returns a string tag for a value without triggering `Symbol.toStringTag`
 * getters in a way that breaks cross-realm values.
 */
function kindOf(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isFunction(value) && value.prototype && value.prototype.constructor &&
      value === value.prototype.constructor) {
    return 'function';
  }
  if (isNumber(value) && isNaN(value)) return 'nan';
  if (isNumber(value)) return 'number';
  if (isBoolean(value)) return 'boolean';
  if (isString(value)) return 'string';
  if (typeof value === 'symbol') return 'symbol';
  if (value === null) return 'null';
  if (isRegExp(value)) return 'regexp';
  if (isArrayBuffer(value)) return 'arraybuffer';
  if (isDate(value)) return 'date';
  if (isFile(value)) return 'file';
  if (isBlob(value)) return 'blob';
  if (isHTMLForm(value)) return 'htmlform';
  if (isFileList(value)) return 'filelist';
  if (isHeaders(value)) return 'headers';
  if (isReadableStream(value)) return 'readablestream';
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

function typeOf(value) {
  return kindOfTest(kindOf(value));
}

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

/** Iterate a FormData/Headers/URLSearchParams entry list. */
function forEachEntry(list, handler) {
  if (!list) return;
  if (typeof list.forEach === 'function' && typeof list.entries !== 'function') {
    // Headers#forEach(value, key) — different argument order
    list.forEach((value, key) => handler(key, value, list));
    return;
  }
  const iterator = typeof list.entries === 'function' ? list.entries() : list;
  const next = iterator.next.bind(iterator);
  let entry;
  while (!(entry = next()).done) {
    handler(entry.value[0], entry.value[1], list);
  }
}

// ── Type predicates ──────────────────────────────────────────────

function isUndefined(val) { return typeof val === 'undefined'; }
function isNull(val) { return val === null; }
function isArray(val) { return Array.isArray(val); }
function isString(val) { return typeof val === 'string'; }
function isNumber(val) { return typeof val === 'number'; }
function isBoolean(val) { return typeof val === 'boolean'; }
function isFunction(val) { return typeof val === 'function'; }
function isRegExp(val) { return Object.prototype.toString.call(val) === '[object RegExp]'; }
function isDate(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime());
}
function isObject(val) { return val !== null && typeof val === 'object'; }

function isPlainObject(val) {
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

function isArrayBuffer(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object ArrayBuffer]';
}

function isArrayBufferView(val) {
  return val !== null && typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(val);
}

function isDataView(val) {
  return typeof DataView !== 'undefined' && val instanceof DataView;
}

function isTypedArray(val) {
  return Array.isBuffer && ArrayBuffer.isView && ArrayBuffer.isView(val) && !isDataView(val);
}

function isBuffer(val) {
  return val != null && val.constructor != null && typeof val.constructor.isBuffer === 'function' &&
    val.constructor.isBuffer(val);
}

function isFormData(thing) {
  let kind;
  return !!(thing && (
    (typeof FormData !== 'undefined' && thing instanceof FormData) || (
      isFunction(thing.append) && (
        (kind = kindOf(thing)) === 'formdata' ||
        // detect form-data instances / AsyncFormData polyfills
        (kind === 'blob' && /^(data|application\/x-www-form-urlencoded)?[;,]?$/.test(thing.type))
      )
    )
  ));
}

/**
 * Detects the *global* FormData constructor as opposed to a form-data polyfill.
 */
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' &&
    thing[Symbol.iterator]);
}

function isHTMLForm(thing) {
  let tag;
  return thing && typeof thing === 'object' && typeof thing.append === 'function' &&
    !((tag = thing[Symbol.toStringTag]) === 'FormData' || tag === 'Blob' || tag === 'URLSearchParams') &&
    !(thing instanceof String);
}

function isBlob(val) {
  return val !== null && typeof Blob !== 'undefined' && (val instanceof Blob ||
    Object.prototype.toString.call(val) === '[object Blob]');
}

function isFile(val) {
  return isBlob(val) && (val.name !== undefined || Object.prototype.toString.call(val) === '[object File]');
}

function isFileList(val) {
  return Object.prototype.toString.call(val) === '[object FileList]';
}

function isHeaders(val) {
  return val !== null && typeof Headers !== 'undefined' && (val instanceof Headers ||
    Object.prototype.toString.call(val) === '[object Headers]');
}

function isReadableStream(val) {
  return isObject(val) && isFunction(val.getReader);
}

function isResponse(val) {
  return isObject(val) && isString(val.status) === false && isNumber(val.status) && isFunction(val.text);
}

function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

function isRequest(val) {
  return isObject(val) && isFunction(val.getResponseHeader);
}

function hasOwnProp(obj, prop) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, prop);
}

// ── Object helpers ───────────────────────────────────────────────

/** Deeply merge plain objects; arrays are copied, other values overwritten. */
function merge(/* ...objs */) {
  const caseless = this && this.caseless;
  const result = {};

  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;

    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge.call(this, result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge.call(this, {}, val);
    } else if (Array.isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };

  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}

/** Case-insensitive own-property lookup (returns the actual key or undefined). */
function findKey(obj, key) {
  key = String(key).toLowerCase();
  return obj ? Object.keys(obj).find((prop) => String(prop).toLowerCase() === key) : undefined;
}

function toCamelCase(str) {
  return String(str).toLowerCase().replace(/[_-\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
}

function trim(str) {
  return str.trim ? str.trim() : String(str).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

function endsWith(str, search) {
  return str && str.endsWith ? str.endsWith(search) : String(str).lastIndexOf(search) !== -1;
}

function matchAll(regex, str) {
  const matches = [];
  if (str == null) return matches;
  const exec = String(regex).matchAll ? String(str).matchAll(regex) : null;
  if (exec) {
    for (const match of exec) matches.push(match);
    return matches;
  }
  // Fallback for engines without String.prototype.matchAll
  const local = new RegExp(regex.source, regex.flags.replace('g', '') + 'g');
  let match;
  while ((match = local.exec(str)) !== null) {
    matches.push(match);
    if (match.index === local.lastIndex) local.lastIndex++;
  }
  return matches;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : null;
}

function noop() {}

/**
 * Convert an object into a JSON-safe copy (used by AxiosError#toJSON).
 * Cycles are dropped and functions/symbols are omitted.
 */
function toJSONObject(obj) {
  const stack = [];

  function visit(source) {
    if (!isPlainObject(source) && !Array.isArray(source)) return source;
    if (stack.indexOf(source) !== -1) return undefined;   // circular
    stack.push(source);
    const target = Array.isArray(source) ? [] : {};
    forEach(source, (value, key) => {
      const val = visit(value);
      if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
        target[key] = val;
      }
    });
    stack.pop();
    return target;
  }

  return visit(obj);
}

const asap = typeof queueMicrotask !== 'undefined'
  ? queueMicrotask.bind(typeof globalThis !== 'undefined' ? globalThis : null)
  : (typeof setImmediate !== 'undefined' ? setImmediate : function (fn) { setTimeout(fn, 0); });

/** A URL is absolute when it starts with "<scheme>://" or "//" (RFC 3986). */
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(String(url));
}

module.exports = {
  // iteration
  forEach,
  forEachEntry,
  // types
  isArray,
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isBoolean,
  isBuffer,
  isDataView,
  isDate,
  isFile,
  isFileList,
  isFormData,
  isFunction,
  isHeaders,
  isHTMLForm,
  isNull,
  isNumber,
  isObject,
  isPlainObject,
  isReadableStream,
  isRegExp,
  isRequest,
  isResponse,
  isSpecCompliantForm,
  isStream,
  isString,
  isTypedArray,
  isUndefined,
  isURLSearchParams,
  // kind helpers (parity with axios' utils.kindOf/utils.typeOf)
  kindOf,
  typeOf,
  // object helpers
  hasOwnProp,
  merge,
  findKey,
  toCamelCase,
  toFiniteNumber,
  trim,
  endsWith,
  matchAll,
  noop,
  toJSONObject,
  asap,
  isAbsoluteURL,
};

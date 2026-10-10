/**
 * sd-axios-fetch v0.1.2
 * A drop-in replacement for Axios.js built on the Fetch API.
 * (CJS / UMD bundle)  —  2026-10-10
 */
'use strict';

// ── Module registry ────────────────────────────────────────────────
const __modules = {};
const __cache = {};

function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  const mod = { exports: {} };
  __cache[id] = mod;
  __modules[id](mod, mod.exports, __require);
  return mod.exports;
}

// ── src/helpers/utils.js ───────────────────────────────────────────
__modules["src/helpers/utils.js"] = function (module, exports, require) {
/**
 * Utility helpers used throughout the library.
 *
 * Mirrors the type predicates and object helpers of `axios/lib/utils.js`
 * so that every edge case behaves the way Axios users expect.
 */
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

};

// ── src/helpers/parseHeaders.js ───────────────────────────────────────────
__modules["src/helpers/parseHeaders.js"] = function (module, exports, require) {
/**
 * parseHeaders - Parse a raw header string into a plain object.
 *
 * Ported from `axios/lib/helpers/parseHeaders.js`.
 * Duplicate `Set-Cookie` values are preserved as arrays.
 */
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

};

// ── src/helpers/speedometer.js ───────────────────────────────────────────
__modules["src/helpers/speedometer.js"] = function (module, exports, require) {
/**
 * speedometer - rolling average transfer-speed calculator (bytes / second).
 *
 * Ported from `axios/lib/helpers/speedometer.js`.
 */
module.exports = function speedometer(interval, maxBufferSize) {
  const buffer = {
    length: 0,
    bytes: 0,
    sample: function sample(value) {
      const len = this.length++;
      buffer.sample = function sample(next) {
        this.length--;
        this.index = next;
        const diff = next - (this.last || next);
        this.last = next;
        this.speed = this.speed === undefined
          ? diff / (interval / 1000)
          : this.speed + 0.5 * (diff / (interval / 1000) - this.speed);

        if (len > maxBufferSize) {
          buffer.bytes = buffer.sample(next);
        } else {
          buffer.bytes += value;
        }
        return buffer.bytes;
      };
      buffer.sample(value);
      return len;
    },
  };

  return function (newValue) {
    return buffer.sample(Number(newValue) || 0);
  };
};

};

// ── src/helpers/throttle.js ───────────────────────────────────────────
__modules["src/helpers/throttle.js"] = function (module, exports, require) {
/**
 * throttle - Throttle decorator.
 *
 * Ported from `axios/lib/helpers/throttle.js`. Returns `[throttled, flush]`
 * so callers can force the pending invocation (used by progress events).
 */
module.exports = function throttle(fn, freq) {
  let timestamp = 0;
  const threshold = 1000 / freq;
  let lastArgs;
  let timer;

  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };

  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };

  const flush = () => lastArgs && invoke(lastArgs);

  return [throttled, flush];
};

};

// ── src/helpers/progressEventReducer.js ───────────────────────────────────────────
__modules["src/helpers/progressEventReducer.js"] = function (module, exports, require) {
/**
 * progressEventReducer / progressEventDecorator - shape raw byte counters into
 * the ProgressEvent-compatible object Axios users expect.
 *
 * Ported from `axios/lib/helpers/progressEventReducer.js`.
 */
const speedometer = require("src/helpers/speedometer.js");
const throttle = require("src/helpers/throttle.js");
const { asap } = require("src/helpers/utils.js");

const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return throttle((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;

    bytesNotified = loaded;

    const data = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? 'download' : 'upload']: true,
    };

    listener(data);
  }, freq);
};

const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;

  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded,
  }), throttled[1]];
};

const asyncDecorator = (fn) => (...args) => asap(() => fn(...args));

module.exports = { progressEventReducer, progressEventDecorator, asyncDecorator };

};

// ── src/helpers/trackStream.js ───────────────────────────────────────────
__modules["src/helpers/trackStream.js"] = function (module, exports, require) {
/**
 * trackStream - Wrap a ReadableStream so every chunk passes through a
 * progress callback (used for onDownloadProgress / onUploadProgress).
 *
 * Ported from `axios/lib/helpers/trackStream.js`.
 */
function* streamChunk(chunk, chunkSize) {
  let len = chunk.byteLength;

  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }

  let pos = 0;
  let end;

  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
}

async function* readBytes(iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
}

async function* readStream(stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }

  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    await reader.cancel();
  }
}

module.exports = function trackStream(stream, chunkSize, onProgress, onFinish) {
  const iterator = readBytes(stream, chunkSize);

  let bytes = 0;
  let done;

  const _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();

        if (done) {
          _onFinish();
          controller.close();
          return;
        }

        const len = value.byteLength;
        if (onProgress) {
          const loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    },
  }, {
    highWaterMark: 2,
  });
};

module.exports.streamChunk = streamChunk;
module.exports.readBytes = readBytes;

};

// ── src/helpers/composeSignals.js ───────────────────────────────────────────
__modules["src/helpers/composeSignals.js"] = function (module, exports, require) {
/**
 * composeSignals - Merge `config.signal`, `config.cancelToken` and
 * `config.timeout` into a single AbortSignal.
 *
 * This fixes a bug where providing a `signal` silently disabled `timeout`.
 * Ported from `axios/lib/helpers/composeSignals.js`.
 */
const CanceledError = require("src/core/CanceledError.js");
const AxiosError = require("src/core/AxiosError.js");
const { asap } = require("src/helpers/utils.js");

/**
 * @param {Array<AbortSignal|undefined>} signals
 * @param {number|undefined} timeout
 * @returns {AbortSignal|undefined}
 */
module.exports = function composeSignals(signals, timeout) {
  signals = signals ? signals.filter(Boolean) : [];
  const { length } = signals;

  if (timeout || length) {
    const controller = new AbortController();

    let aborted;

    const onabort = function (reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError ? err
          : new CanceledError(err instanceof Error ? err.message : err));
      }
    };

    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT));
    }, timeout);

    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal) => {
          signal.unsubscribe
            ? signal.unsubscribe(onabort)
            : signal.removeEventListener('abort', onabort);
        });
        signals = null;
      }
    };

    signals.forEach((signal) => signal.addEventListener('abort', onabort));

    const { signal } = controller;

    signal.unsubscribe = () => asap(unsubscribe);

    return signal;
  }
};

};

// ── src/helpers/toFormData.js ───────────────────────────────────────────
__modules["src/helpers/toFormData.js"] = function (module, exports, require) {
/**
 * toFormData - Convert an arbitrary object into a FormData instance.
 *
 * Ported from `axios/lib/helpers/toFormData.js` (nested keys rendered as
 * `a[b][c]`, `{}` meta-tokens, `[]` array markers, Blob support).
 */
const AxiosError = require("src/core/AxiosError.js");
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
} = require("src/helpers/utils.js");

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

};

// ── src/helpers/formDataToJSON.js ───────────────────────────────────────────
__modules["src/helpers/formDataToJSON.js"] = function (module, exports, require) {
/**
 * formDataToJSON - Convert a FormData instance into a plain object.
 *
 * Understands `foo[x][y]`, `foo[]` and dotted keys, matching
 * `axios/lib/helpers/formDataToJSON.js`.
 */
const { isArray, isFormData, isFunction, hasOwnProp, matchAll, forEachEntry } = require("src/helpers/utils.js");

/**
 * Takes a string like `foo[x][y][z]` and returns `['foo', 'x', 'y', 'z']`.
 */
function parsePropPath(name) {
  // foo[x][y][z] | foo.x.y.z | foo-x-y-z | foo x y z
  return matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === '[]' ? '' : (match[1] || match[0]);
  });
}

/** Converts an array to an object. */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  for (i = 0; i < len; i++) {
    obj[keys[i]] = arr[keys[i]];
  }
  return obj;
}

function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];

    if (name === '__proto__') return true;

    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && isArray(target) ? target.length : name;

    if (isLast) {
      if (hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }

      return !isNumericKey;
    }

    if (!target[name] || typeof target[name] !== 'object') {
      target[name] = [];
    }

    const result = buildPath(path, value, target[name], index);

    if (result && isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }

    return !isNumericKey;
  }

  if (isFormData(formData) && isFunction(formData.entries)) {
    const obj = {};

    forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });

    return obj;
  }

  return null;
}

module.exports = formDataToJSON;

};

// ── src/core/AxiosError.js ───────────────────────────────────────────
__modules["src/core/AxiosError.js"] = function (module, exports, require) {
/**
 * AxiosError - Drop-in compatible error class matching Axios error structure.
 *
 * Ported from `axios/lib/core/AxiosError.js` (1.7.x) including the error code
 * constants, the `isAxiosError` marker and the `status` field.
 */
const { toJSONObject } = require("src/helpers/utils.js");

/**
 * Create an Error with the specified message, config, error code, request and
 * response.
 */
class AxiosError extends Error {
  constructor(message, code, config, request, response) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }

    this.message = message;
    this.name = 'AxiosError';

    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);

    if (response) {
      this.response = response;
      this.status = response.status ? response.status : null;
    }
  }

  /**
   * `axios.AxiosError.from(error, code, config, request, response)`
   * Copies own properties of the source error (minus `isAxiosError`).
   */
  static from(error, code, config, request, response, customProps) {
    const axiosError = new AxiosError(
      error && error.message, code, config, request, response,
    );

    if (error && typeof error === 'object') {
      for (const key of Object.keys(error)) {
        if (key === 'isAxiosError' || key === 'message' || key === 'name' ||
          key === 'config' || key === 'request' || key === 'response') {
          continue;
        }
        if (axiosError[key] === undefined) {
          try {
            axiosError[key] = error[key];
          } catch (_e) { /* read-only property */ }
        }
      }
    }

    if (code === undefined && error && error.code !== undefined) {
      axiosError.code = error.code;
    }

    axiosError.cause = error;

    customProps && Object.assign(axiosError, customProps);

    return axiosError;
  }

  /**
   * Create a timeout error. `transitional.clarifyTimeoutError` selects between
   * `ECONNABORTED` and `ETIMEDOUT` exactly like Axios.
   */
  static timeout(config, request, message) {
    const transitional = config && config.transitional;
    const clarify = transitional && transitional.clarifyTimeoutError;
    const msg = message || config.timeoutErrorMessage ||
      `timeout of ${config.timeout}ms exceeded`;

    return new AxiosError(msg, clarify ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED, config, request);
  }

  toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: toJSONObject(this.config),
      code: this.code,
      status: this.status,
    };
  }

  // ---------- static helpers matching Axios patterns ----------

  /** @deprecated axios >= 1.x uses CanceledError */
  static cancel(message, config, request) {
    const CanceledError = require("src/core/CanceledError.js");
    return new CanceledError(message, config, request);
  }

  /**
   * Convenience factory: wrap a generic error as a network error.
   * (`AxiosError.from(error, config, request, response)`)
   */
  static fromError(error, config, request, response, code) {
    return AxiosError.from(error, code || AxiosError.ERR_NETWORK, config, request, response);
  }

  /**
   * Create an error for a non-2xx response (used by settle()).
   */
  static badStatus(status, statusText, config, request, response) {
    const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(status / 100) - 4];
    return new AxiosError(`Request failed with status code ${status}`, code, config, request, response);
  }

  /**
   * Create a request configuration error.
   */
  static badConfig(message, config) {
    return new AxiosError(message, AxiosError.ERR_BAD_OPTION, config, null, null);
  }

  static isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  static isAxiosError(payload) {
    return payload instanceof AxiosError;
  }
}

const prototype = AxiosError.prototype;

Object.defineProperty(prototype, 'isAxiosError', { value: true });

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED',
  'ERR_NOT_SUPPORT',
  'ERR_INVALID_URL',
].forEach((code) => {
  Object.defineProperty(AxiosError, code, { value: code });
});

Object.defineProperties(AxiosError, {
  from: { value: AxiosError.from, writable: false },
  isCancel: { value: AxiosError.isCancel, writable: false },
  isAxiosError: { value: AxiosError.isAxiosError, writable: false },
  timeout: { value: AxiosError.timeout, writable: false },
  cancel: { value: AxiosError.cancel, writable: false },
});

module.exports = AxiosError;

};

// ── src/core/AxiosHeaders.js ───────────────────────────────────────────
__modules["src/core/AxiosHeaders.js"] = function (module, exports, require) {
/**
 * AxiosHeaders - The header container used for both request and response
 * headers, ported from `axios/lib/core/AxiosHeaders.js`.
 *
 * Differences from Axios: the "reserved names hotfix" (`.Set`, `.Get`, ...)
 * is omitted because it is not part of the documented API.
 */
const {
  forEach,
  findKey,
  toCamelCase,
  isPlainObject,
  isArray,
  isFunction,
  isString,
  isRegExp,
  isHeaders,
  trim,
} = require("src/helpers/utils.js");

const parseHeaders = require("src/helpers/parseHeaders.js");

const $internals = Symbol('internals');

function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return isArray(value) ? value.map(normalizeValue) : String(value);
}

function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

/**
 * Detects an AxiosHeaders instance even when it comes from a different copy of
 * the class (e.g. a duplicated module in a mis-bundled build). Without this a
 * foreign instance would fall through to the "header name" branch and throw.
 */
const isAxiosHeadersInstance = (thing) => thing != null && typeof thing === 'object' &&
  Object.prototype.toString.call(thing) === '[object AxiosHeaders]';

function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (isFunction(filter)) {
    return filter.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!isString(value)) return;
  if (isString(filter)) {
    return value.indexOf(filter) !== -1;
  }
  if (isRegExp(filter)) {
    return filter.test(value);
  }
}

function formatHeader(header) {
  return header.trim()
    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => char.toUpperCase() + str);
}

function buildAccessors(obj, header) {
  const accessorName = toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function (arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true,
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = findKey(self, lHeader);

      if (!key || self[key] === undefined || _rewrite === true ||
        (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (isPlainObject(header) || header instanceof this.constructor || isAxiosHeadersInstance(header)) {
      setHeaders(header, valueOrRewrite);
    } else if (isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (isHeaders(header)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = findKey(this, header);

      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];
          deleted = true;
        }
      }
    }

    if (isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format) {
    const self = this;
    const headers = {};

    forEach(this, (value, header) => {
      const key = findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : trim(String(header));

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }

  toJSON(asStrings) {
    const obj = Object.create(null);

    forEach(this, (value, header) => {
      value != null && value !== false &&
        (obj[header] = asStrings && isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }

  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }

  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first, ...targets) {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header) {
    const internals = this[$internals] = (this[$internals] = { accessors: {} });
    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);

      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

    return this;
  }
}

AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding',
  'User-Agent', 'Authorization']);

// freeze the statics so they cannot be reassigned (axios behaviour)
['from', 'concat', 'accessor'].forEach((method) => {
  Object.defineProperty(AxiosHeaders, method, { writable: false, value: AxiosHeaders[method] });
});

module.exports = AxiosHeaders;

};

// ── src/core/CanceledError.js ───────────────────────────────────────────
__modules["src/core/CanceledError.js"] = function (module, exports, require) {
/**
 * CanceledError - Dedicated class for aborted / cancelled requests.
 *
 * Axios >= 0.22 exposes `axios.CanceledError` (aliased as `axios.Cancel`).
 * It extends AxiosError with a `__CANCEL__` flag so `axios.isCancel(error)`
 * returns true.
 */
const AxiosError = require("src/core/AxiosError.js");

class CanceledError extends AxiosError {
  constructor(message, config, request) {
    super(message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

module.exports = CanceledError;

};

// ── src/core/CancelToken.js ───────────────────────────────────────────
__modules["src/core/CancelToken.js"] = function (module, exports, require) {
/**
 * CancelToken - Imperative cancellation token (Axios pre-v0.22 API).
 *
 * Ported from `axios/lib/cancel/CancelToken.js`: `subscribe()` now returns an
 * unsubscribe function and `toAbortSignal()` bridges it to AbortController.
 */
const CanceledError = require("src/core/CanceledError.js");

class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    this.promise.then(function onCancel(cancel) {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // allow `.then()` consumers to opt out via `promise.cancel()`
    this.promise.then = function (onfulfilled) {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal.
   * @returns {Function} unsubscribe callback
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return function () {};
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }

    return this.unsubscribe.bind(this);
  }

  /**
   * Remove a previously registered listener.
   */
  unsubscribe(listener) {
    if (!this._listeners) return;

    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Bridge this CancelToken to an AbortSignal so it can be composed with
   * `config.signal` and `config.timeout`.
   */
  toAbortSignal() {
    const controller = new AbortController();

    const abort = (err) => {
      controller.abort(err);
    };

    this.subscribe(abort);

    controller.signal.unsubscribe = () => this.unsubscribe(abort);

    return controller.signal;
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that,
   * when called, cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return { token, cancel };
  }

  /**
   * Throw if the given token has already been cancelled.
   */
  static throwIfRequested(token) {
    if (token && token.reason) {
      throw token.reason;
    }
  }
}

module.exports = CancelToken;

};

// ── src/core/InterceptorManager.js ───────────────────────────────────────────
__modules["src/core/InterceptorManager.js"] = function (module, exports, require) {
/**
 * InterceptorManager - Manages request & response interceptor stacks.
 *
 * Mirrors the Axios InterceptorManager interface exactly, including the
 * `{ synchronous, runWhen }` options supported by Axios >= 1.x:
 *
 *   - use(fulfilled, rejected, options) → id
 *   - eject(id)
 *   - forEach(fn)                       → iterate registered handlers
 *   - clear()
 */
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack.
   *
   * @param {Function} [fulfilled] - Fulfilled handler.
   * @param {Function} [rejected]  - Rejected handler.
   * @param {Object}   [options]
   * @param {boolean}  [options.synchronous=false] Run the interceptor outside
   *        of the promise chain (must return the config, not a promise).
   * @param {Function} [options.runWhen] Only run when it returns true.
   * @returns {number} Numeric ID that can be passed to eject().
   */
  use(fulfilled, rejected, options) {
    if (typeof fulfilled !== 'function') {
      throw new TypeError('Interceptor resolved must be a function');
    }
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: !!(options && options.synchronous),
      runWhen: options ? options.runWhen : null,
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor by its ID.
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;           // Axios uses null to preserve indices
    }
  }

  /**
   * Iterate over all active (non-ejected) handlers.
   */
  forEach(fn) {
    this.handlers.forEach((h) => {
      if (h !== null) fn(h);
    });
  }

  /**
   * Remove all interceptors.
   */
  clear() {
    if (this.handlers.length > 0) {
      this.handlers = [];
    }
  }
}

module.exports = InterceptorManager;

};

// ── src/core/AxiosURLSearchParams.js ───────────────────────────────────────────
__modules["src/core/AxiosURLSearchParams.js"] = function (module, exports, require) {
/**
 * AxiosURLSearchParams - Params serializer used by `buildURL`.
 *
 * Ported from `axios/lib/helpers/AxiosURLSearchParams.js`. It reuses
 * `toFormData` so nested objects / arrays / dates render exactly like Axios.
 */
const toFormData = require("src/helpers/toFormData.js");

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

};

// ── src/core/buildURL.js ───────────────────────────────────────────
__modules["src/core/buildURL.js"] = function (module, exports, require) {
/**
 * buildURL / combineURLs / buildFullPath / isURLSameOrigin — matching the
 * Axios helpers so URLs, params and interceptors behave natively.
 */
const AxiosURLSearchParams = require("src/core/AxiosURLSearchParams.js");
const { isURLSearchParams, isString } = require("src/helpers/utils.js");

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

};

// ── src/core/transformData.js ───────────────────────────────────────────
__modules["src/core/transformData.js"] = function (module, exports, require) {
/**
 * transformData - Apply transformRequest / transformResponse chains.
 *
 * Ported from `axios/lib/core/transformData.js`. Transformers are invoked
 * with the config as `this`, receive `(data, headers, status)` and may return
 * a Promise (async transforms are supported since Axios 1.x).
 */
const defaults = require("src/core/defaults.js");
const AxiosHeaders = require("src/core/AxiosHeaders.js");
const { forEach } = require("src/helpers/utils.js");

/**
 * @param {Function[]} fns         - The transform chain.
 * @param {Object}     [response]  - A response (transformResponse) or the
 *                                    config itself (transformRequest).
 * @returns {*} The transformed data — a Promise when any transform is async.
 */
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders.from(context.headers);
  let data = context.data;

  forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  return data;
}

module.exports = transformData;

};

// ── src/core/defaults.js ───────────────────────────────────────────
__modules["src/core/defaults.js"] = function (module, exports, require) {
/**
 * defaults - The Axios default configuration, ported from
 * `axios/lib/defaults/index.js` and `axios/lib/defaults/transitional.js`.
 */
const AxiosError = require("src/core/AxiosError.js");
const toFormData = require("src/helpers/toFormData.js");
const formDataToJSON = require("src/helpers/formDataToJSON.js");
const {
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isFile,
  isFileList,
  isFormData,
  isHTMLForm,
  isObject,
  isReadableStream,
  isStream,
  isString,
  isURLSearchParams,
} = require("src/helpers/utils.js");

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

    if (isArrayBuffer(data) || isStream(data) || isFile(data) || isBlob(data) || isReadableStream(data)) {
      return data;
    }

    if (isArrayBufferView(data)) {
      return data.buffer;
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

};

// ── src/core/mergeConfig.js ───────────────────────────────────────────
__modules["src/core/mergeConfig.js"] = function (module, exports, require) {
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
const defaults = require("src/core/defaults.js");
const AxiosHeaders = require("src/core/AxiosHeaders.js");
const { isArray, isPlainObject, isUndefined, merge } = require("src/helpers/utils.js");

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

};

// ── src/core/settle.js ───────────────────────────────────────────
__modules["src/core/settle.js"] = function (module, exports, require) {
/**
 * settle - Resolve or reject a promise based on validateStatus.
 *
 * Matches the Axios settle helper (4xx → ERR_BAD_REQUEST, 5xx → ERR_BAD_RESPONSE).
 */
const AxiosError = require("src/core/AxiosError.js");

/**
 * Resolve or reject based on validateStatus(config)(status).
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @param {Object}   response - The fully-constructed AxiosResponse.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(AxiosError.badStatus(
      response.status,
      response.statusText,
      response.config,
      response.request,
      response,
    ));
  }
}

module.exports = settle;

};

// ── src/adapters/fetch.js ───────────────────────────────────────────
__modules["src/adapters/fetch.js"] = function (module, exports, require) {
/**
 * Fetch Adapter — the bridge between Axios config objects and native fetch().
 *
 * Mirrors `axios/lib/adapters/fetch.js` and adds the network-error
 * classification this library is known for.
 *
 * Responsibilities:
 *  1. Build the full URL (baseURL + url + params)
 *  2. Resolve authentication (Basic auth → Authorization header)
 *  3. Fetch the XSRF token from cookies when appropriate
 *  4. Compose the abort signal (signal + cancelToken + timeout)
 *  5. Execute fetch() with the correct options
 *  6. Dispatch onUploadProgress / onDownloadProgress via stream tracking
 *  7. Parse the response body according to responseType
 *  8. Construct an Axios-compatible response object and settle the promise
 */
const { buildURL, buildFullPath, isURLSameOrigin } = require("src/core/buildURL.js");
const settle        = require("src/core/settle.js");
const AxiosError    = require("src/core/AxiosError.js");
const CanceledError = require("src/core/CanceledError.js");
const AxiosHeaders  = require("src/core/AxiosHeaders.js");
const composeSignals = require("src/helpers/composeSignals.js");
const trackStream    = require("src/helpers/trackStream.js");
const {
  progressEventReducer,
  progressEventDecorator,
  asyncDecorator,
} = require("src/helpers/progressEventReducer.js");
const {
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isFileList,
  isFormData,
  isFunction,
  isReadableStream,
  isString,
  isURLSearchParams,
} = require("src/helpers/utils.js");

// ── Polyfills for Node.js < 16 ──────────────────────────────────
// btoa/atob are global in browsers and Node.js >= 16
if (typeof globalThis.btoa === 'undefined' && typeof Buffer !== 'undefined') {
  globalThis.btoa = function btoa(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}
if (typeof globalThis.atob === 'undefined' && typeof Buffer !== 'undefined') {
  globalThis.atob = function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
  };
}

// ── Environment detection ────────────────────────────────────────
const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' &&
  typeof Response === 'function';
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === 'function';

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};

/**
 * Feature-detect streaming *request* bodies (needed for onUploadProgress).
 *
 * Axios only checks whether the runtime reads the `duplex` option. Some
 * runtimes (notably Bun) ignore `duplex` but still accept a stream body, so we
 * additionally accept a runtime that keeps the stream on `request.body`.
 */
const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;

  const request = new Request('http://localhost', {
    body: new ReadableStream(),
    method: 'POST',
    get duplex() {
      duplexAccessed = true;
      return 'half';
    },
  });

  return !request.headers.has('Content-Type') &&
    (duplexAccessed || isReadableStream(request.body));
});

const supportsResponseStream = isReadableStreamSupported &&
  test(() => isReadableStream(new Response('').body));

const encodeText = isFetchSupported && (typeof TextEncoder === 'function' ?
  ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) :
  async (str) => new Uint8Array(await new Response(str).arrayBuffer()));

/**
 * Response body resolvers, one per Axios responseType.
 * Axios performs a case-insensitive lookup (`utils.findKey`); keys here are
 * already lowercased and `responseType` is lowercased before lookup.
 */
const resolvers = {
  stream: supportsResponseStream && ((res) => res.body),
};

if (isFetchSupported) {
  ['text', 'arraybuffer', 'blob', 'formdata'].forEach((type) => {
    const methodName = type === 'arraybuffer' ? 'arrayBuffer'
      : type === 'formdata' ? 'formData'
        : type;

    resolvers[type] = isFunction(Response.prototype[methodName])
      ? (res) => res[methodName]()
      : (_, config) => {
        throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
      };
  });

  // `responseType: 'response'` yields the raw Response object (as Axios' xhr adapter does).
  resolvers.response = (res) => res;
}

/**
 * Pick the resolver for a responseType, falling back to text for unknown
 * types (`json` included — JSON parsing happens in transformResponse).
 */
function resolveResponseHandler(responseType) {
  return resolvers[responseType] || resolvers.text;
}

const VALID_RESPONSE_TYPES = ['arraybuffer', 'blob', 'document', 'json', 'text', 'stream', 'formdata', 'response', ''];

const VALID_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];

/**
 * Read a cookie by name (browser only; no-op in Node).
 */
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)(' + encodeURIComponent(name) + ')=([^;]*)'),
  );
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Determine the number of bytes the request body will produce.
 */
async function getBodyLength(body) {
  if (body == null) return 0;

  if (isBlob(body)) return body.size;

  if (isFormData(body) || isFileList(body)) {
    const _request = new Request('http://localhost', { method: 'POST', body });
    return (await _request.arrayBuffer()).byteLength;
  }

  if (isArrayBufferView(body) || isArrayBuffer(body)) return body.byteLength;

  if (isURLSearchParams(body)) body = body + '';

  if (isString(body)) return (await encodeText(body)).byteLength;
}

async function resolveBodyLength(headers, body) {
  const contentLength = headers.getContentLength
    ? parseInt(headers.getContentLength(), 10) : NaN;

  return isNaN(contentLength) ? getBodyLength(body) : contentLength;
}

/**
 * Convert a native `Headers` instance into an AxiosHeaders instance,
 * preserving repeated `Set-Cookie` values as an array where possible.
 */
function responseHeadersToAxiosHeaders(headers) {
  const result = new AxiosHeaders();

  if (isString(headers)) {
    const parseHeaders = require("src/helpers/parseHeaders.js");
    return AxiosHeaders.from(parseHeaders(headers));
  }

  if (!headers) return result;

  if (isFunction(headers.getSetCookie)) {
    const setCookies = headers.getSetCookie();
    if (setCookies.length > 0) {
      result.set('set-cookie', setCookies.length === 1 ? setCookies[0] : setCookies, true);
    }
  }

  if (typeof headers.forEach === 'function' && !Array.isArray(headers)) {
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      result.set(key, value, true);
    });
  } else {
    for (const key of Object.keys(headers)) {
      result.set(key, headers[key], true);
    }
  }

  return result;
}

/**
 * Dispatch a request using the Fetch API.
 *
 * @param {Object} config - Fully-merged Axios config (already transformed).
 * @returns {Promise<Object>} AxiosResponse-shaped object.
 */
async function fetchAdapter(config) {
  if (!isFetchSupported) {
    throw new AxiosError(
      'Fetch API is not supported by this environment',
      AxiosError.ERR_NOT_SUPPORT,
      config,
    );
  }

  // ── Input validation & security ────────────────────────────────────
  const fullPath = buildFullPath(config.baseURL, config.url);

  if (!fullPath || !isString(fullPath)) {
    throw AxiosError.badConfig('"url" must be a non-empty string', config);
  }

  // Reject URLs with dangerous protocols
  try {
    const parsed = new URL(fullPath, 'http://base');
    if (!VALID_PROTOCOLS.includes(parsed.protocol.toLowerCase())) {
      throw AxiosError.badConfig(`Unsupported protocol: ${parsed.protocol}`, config);
    }
  } catch (e) {
    if (e && e.isAxiosError) throw e;
    // If URL parsing fails, continue and let fetch() handle it
  }

  // Validate timeout is a positive number
  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout < 0)) {
    throw AxiosError.badConfig('"timeout" must be a non-negative number', config);
  }

  // Validate responseType
  let responseType = config.responseType ? String(config.responseType).toLowerCase() : '';

  if (responseType && !VALID_RESPONSE_TYPES.includes(responseType)) {
    throw new AxiosError(
      'Unknown response type: ' + config.responseType,
      AxiosError.ERR_BAD_OPTION_VALUE,
      config,
    );
  }

  // Work on a copy: auth / XSRF / FormData header fix-ups must not leak into
  // `response.config.headers` (upstream axios applies them to a detached copy).
  const headers = AxiosHeaders.concat(config.headers);

  let data = config.data;

  // Build the final URL with params
  const url = buildURL(fullPath, config.params, config.paramsSerializer);

  // ── HTTP basic authentication ──────────────────────────────────────
  if (config.auth) {
    headers.set('Authorization', 'Basic ' +
      btoa((config.auth.username || '') + ':' + (config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '')),
    );
  }

  // Let the runtime set the multipart boundary. If we keep the
  // `application/x-www-form-urlencoded` header that dispatchRequest adds, the
  // FormData body would be sent with a multipart boundary but the wrong type.
  if (isFormData(data)) {
    headers.setContentType(undefined);
  }

  // ── XSRF token (browser only) ─────────────────────────────────────
  if (typeof document !== 'undefined' && typeof document.cookie !== 'undefined') {
    let withXSRFToken = config.withXSRFToken;

    if (withXSRFToken && isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(config);
    }

    if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(url))) {
      const xsrfValue = config.xsrfHeaderName && config.xsrfCookieName &&
        readCookie(config.xsrfCookieName);

      if (xsrfValue) {
        headers.set(config.xsrfHeaderName, xsrfValue);
      }
    }
  }

  // ── Abort / cancellation / timeout (composed) ─────────────────────
  const composedSignal = composeSignals(
    [config.signal, config.cancelToken && config.cancelToken.toAbortSignal()],
    config.timeout,
  );

  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });

  let requestContentLength;
  let request;

  try {
    const wantsUploadProgress = config.onUploadProgress && supportsRequestStream &&
      config.method !== 'get' && config.method !== 'head';
    const wantsBodyLength = (config.maxBodyLength === undefined ? -1 : config.maxBodyLength) > -1;

    if ((wantsUploadProgress || wantsBodyLength) && data != null) {
      requestContentLength = await resolveBodyLength(headers, data);
    }

    if (wantsUploadProgress && requestContentLength !== 0) {
      const _request = new Request('http://localhost', { method: 'POST', body: data, duplex: 'half' });

      const contentTypeHeader = _request.headers.get('content-type');

      if (isFormData(data) && contentTypeHeader) {
        headers.setContentType(contentTypeHeader);
      }

      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(config.onUploadProgress)),
        );

        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }

    if (wantsBodyLength && requestContentLength > config.maxBodyLength) {
      throw new AxiosError(
        'Request body larger than maxBodyLength limit: ' + requestContentLength + ' > ' + config.maxBodyLength,
        AxiosError.ERR_BAD_REQUEST,
        config,
      );
    }

    let withCredentials = config.withCredentials;
    if (!isString(withCredentials)) {
      withCredentials = withCredentials ? 'include' : 'omit';
    }

    const fetchOptions = buildFetchOptions(config, data, headers, withCredentials);

    request = new Request(url, Object.assign(fetchOptions, {
      signal: composedSignal,
      method: config.method ? config.method.toUpperCase() : 'GET',
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: 'half',
      credentials: 'credentials' in Request.prototype ? withCredentials : undefined,
    }));

    config.request = request;

    const startTime = Date.now();
    config.startTime = startTime;

    let response = await fetch(request);

    const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');

    const maxContentLength = config.maxContentLength === -1 ? -1 : config.maxContentLength;

    // Wrap the body when we need progress events, a stream response (so the
    // caller can unsubscribe), or byte-limit enforcement.
    if (supportsResponseStream && (config.onDownloadProgress || isStreamResponse || maxContentLength > -1)) {
      const options = {};
      ['status', 'statusText', 'headers'].forEach((prop) => {
        options[prop] = response[prop];
      });

      const responseContentLength = parseInt(response.headers.get('content-length'), 10);
      const total = isNaN(responseContentLength) ? null : responseContentLength;

      const [onProgress, flush] = config.onDownloadProgress && progressEventDecorator(
        total,
        progressEventReducer(asyncDecorator(config.onDownloadProgress), true),
      ) || [];

      const guardedProgress = (onProgress || maxContentLength > -1) && ((loaded) => {
        if (maxContentLength > -1 && loaded > maxContentLength) {
          throw new AxiosError(
            'maxContentLength size of ' + maxContentLength + ' exceeded',
            AxiosError.ERR_BAD_RESPONSE,
            config,
          );
        }
        onProgress && onProgress(loaded);
      });

      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, guardedProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }),
        options,
      );
    }

    responseType = responseType || 'text';

    const responseData = await resolveResponseHandler(responseType)(response, config);

    !isStreamResponse && unsubscribe && unsubscribe();

    const axiosResponse = {
      data: responseData,
      headers: responseHeadersToAxiosHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
      config,
      request,
      // Non-standard extras (harmless additions)
      _startTime: startTime,
      _elapsed: Date.now() - startTime,
    };

    return await new Promise((resolve, reject) => {
      settle(resolve, reject, axiosResponse);
    });
  } catch (err) {
    unsubscribe && unsubscribe();

    // Timeout / cancellation surfaced through the composed signal. This must
    // be checked before `err.isAxiosError` because the abort reason *is* an
    // AxiosError (ETIMEDOUT / CanceledError).
    if (composedSignal && composedSignal.reason instanceof AxiosError) {
      const reason = composedSignal.reason;
      if (reason.code === AxiosError.ETIMEDOUT) {
        throw AxiosError.timeout(config, config.request || request, config.timeoutErrorMessage);
      }
      throw reason;
    }

    if (err && err.isAxiosError) throw err;

    if (err instanceof CanceledError || AxiosError.isCancel(err)) throw err;

    if (err && err.name === 'AbortError') {
      throw new CanceledError(null, config, config.request || request);
    }

    if (err && err.name === 'TypeError' && /fetch/i.test(err.message)) {
      const axiosError = new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, config.request);
      axiosError.cause = err.cause || err;
      throw classifyNetworkError(axiosError, err, config);
    }

    throw classifyNetworkError(AxiosError.from(err, err && err.code, config, config.request), err, config);
  }
}

/**
 * Fetch-only options mapped from the Axios config (mode, cache, redirect…).
 */
function buildFetchOptions(config, data, headers, withCredentials) {
  const options = {};

  if (withCredentials === 'include') {
    options.credentials = 'include';
  }

  if (config.maxRedirects === 0) {
    options.redirect = 'manual';
  } else if (config.maxRedirects === -1) {
    options.redirect = 'follow';
  }

  if (config.cache !== undefined) options.cache = config.cache;
  if (config.mode) options.mode = config.mode;
  if (config.referrer) options.referrer = config.referrer;
  if (config.referrerPolicy) options.referrerPolicy = config.referrerPolicy;
  if (config.integrity) options.integrity = config.integrity;
  if (config.keepalive !== undefined) options.keepalive = config.keepalive;

  // GET/HEAD requests MUST NOT have a body (fetch/undici enforce this)
  const method = (config.method || 'get').toUpperCase();

  if (data !== undefined && data !== null && data !== '' && method !== 'GET' && method !== 'HEAD') {
    options.body = data;
  }

  return options;
}

/**
 * Enrich a network error with a more specific code when we can tell what
 * happened (this is an improvement over upstream Axios).
 */
function classifyNetworkError(axiosError, err, config) {
  const cause = err && (err.cause || err);
  const code = cause && cause.code;

  switch (code) {
    case 'ECONNREFUSED':
    case 'ERR_CONNECTION_REFUSED':
      axiosError.code = 'ECONNREFUSED';
      axiosError.message = 'connect ECONNREFUSED';
      break;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      axiosError.code = 'ENOTFOUND';
      axiosError.message = 'getaddrinfo ENOTFOUND';
      break;
    case 'ENETUNREACH':
      axiosError.code = 'ENETUNREACH';
      axiosError.message = 'network is unreachable';
      break;
    case 'EHOSTUNREACH':
      axiosError.code = 'EHOSTUNREACH';
      axiosError.message = 'connect EHOSTUNREACH';
      break;
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
    case 'UND_ERR_HEADERS_TIMEOUT':
      axiosError.code = 'ECONNABORTED';
      axiosError.message = `timeout of ${config.timeout}ms exceeded`;
      break;
    case 'UND_ERR_SOCKET':
      axiosError.message = 'socket hang up';
      break;
    case 'CERT_HAS_EXPIRED':
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
      axiosError.code = 'ERR_BAD_REQUEST';
      break;
    default:
      break;
  }

  return axiosError;
}

module.exports = fetchAdapter;
module.exports.supportsRequestStream = supportsRequestStream;
module.exports.supportsResponseStream = supportsResponseStream;
module.exports.isFetchSupported = isFetchSupported;

};

// ── src/core/dispatchRequest.js ───────────────────────────────────────────
__modules["src/core/dispatchRequest.js"] = function (module, exports, require) {
/**
 * dispatchRequest - Runs the transform pipeline around the adapter.
 *
 * Ported from `axios/lib/core/dispatchRequest.js`. Keeping this separate from
 * `Axios#_request` means request interceptors see the *raw* config while the
 * adapter always receives a fully transformed one, and response/error
 * transforms are applied on both the resolve and reject paths.
 */
const transformData = require("src/core/transformData.js");
const defaults = require("src/core/defaults.js");
const AxiosHeaders = require("src/core/AxiosHeaders.js");
const CanceledError = require("src/core/CanceledError.js");
const AxiosError = require("src/core/AxiosError.js");
const fetchAdapter = require("src/adapters/fetch.js");

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

async function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders.from(config.headers);

  // Transform request data (may be async)
  config.data = await transformData.call(config, config.transformRequest);

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = fetchAdapter;

  try {
    const response = await adapter(config);

    throwIfCancellationRequested(config);

    response.data = await transformData.call(config, config.transformResponse, response);
    response.headers = AxiosHeaders.from(response.headers);

    return response;
  } catch (reason) {
    if (!AxiosError.isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform the error response too, so `error.response.data` is parsed
      if (reason && reason.response) {
        reason.response.data = await transformData.call(config, config.transformResponse, reason.response);
        reason.response.headers = AxiosHeaders.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  }
}

dispatchRequest.defaults = defaults;

module.exports = dispatchRequest;

};

// ── src/Axios.js ───────────────────────────────────────────
__modules["src/Axios.js"] = function (module, exports, require) {
/**
 * Axios — drop-in replacement class.
 *
 * Every public method and property mirrors the official Axios interface so
 * existing code that imports `axios` can swap the module with zero changes.
 *
 *   axios(config)
 *   axios(url[, config])
 *   axios.request
 *   axios.get / .post / .put / .patch / .delete / .head / .options
 *   axios.purge / .link / .unlink
 *   axios.postForm / .putForm / .patchForm
 *   axios.create([defaults])
 *   axios.all / axios.spread
 *   axios.defaults
 *   axios.interceptors.request / .response
 *   axios.getUri
 */
const mergeConfig        = require("src/core/mergeConfig.js");
const defaults           = require("src/core/defaults.js");
const InterceptorManager = require("src/core/InterceptorManager.js");
const AxiosError         = require("src/core/AxiosError.js");
const CanceledError      = require("src/core/CanceledError.js");
const CancelToken        = require("src/core/CancelToken.js");
const AxiosHeaders       = require("src/core/AxiosHeaders.js");
const dispatchRequest    = require("src/core/dispatchRequest.js");
const { buildURL, buildFullPath } = require("src/core/buildURL.js");
const toFormData         = require("src/helpers/toFormData.js");
const formDataToJSON     = require("src/helpers/formDataToJSON.js");
const { isFunction, isPlainObject, merge, forEach } = require("src/helpers/utils.js");

/**
 * The Axios constructor — instances hold `defaults` + `interceptors` and the
 * `request()` method (also exposed as a callable factory by `Axios.create`).
 *
 * @param {Object} [instanceConfig] - Instance-level defaults.
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig || {};
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  };
}

// ── Core request method ──────────────────────────────────────────

/**
 * Dispatch a request.
 *
 * @param {String|Object} configOrUrl
 * @param {Object} [config]
 * @returns {Promise}
 */
Axios.prototype.request = function request(configOrUrl, config) {
  return this._request(configOrUrl, config);
};

/**
 * @private
 */
Axios.prototype._request = function _request(configOrUrl, config) {
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config);

  const { paramsSerializer } = config;

  if (paramsSerializer != null) {
    if (isFunction(paramsSerializer)) {
      config.paramsSerializer = { serialize: paramsSerializer };
    }
  }

  // Set config.method
  config.method = (config.method || this.defaults.method || 'get').toLowerCase();

  // Flatten headers (common + per-method), matching Axios' AxiosHeaders.concat
  let contextHeaders = config.headers && merge(config.headers.common, config.headers[config.method]);

  config.headers && forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    (method) => {
      delete config.headers[method];
    },
  );

  config.headers = AxiosHeaders.concat(contextHeaders, config.headers);

  // filter out skipped interceptors
  const requestInterceptorChain = [];
  let synchronousRequestInterceptors = true;

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (isFunction(interceptor.runWhen) && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  const responseInterceptorChain = [];

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  let promise;
  let i = 0;
  let len;

  if (!synchronousRequestInterceptors) {
    const chain = [dispatchRequest.bind(this), undefined];
    chain.unshift.apply(chain, requestInterceptorChain);
    chain.push.apply(chain, responseInterceptorChain);
    len = chain.length;

    promise = Promise.resolve(config);

    while (i < len) {
      promise = promise.then(chain[i++], chain[i++]);
    }

    return promise;
  }

  // Synchronous interceptor chain
  len = requestInterceptorChain.length;

  let newConfig = config;

  i = 0;

  while (i < len) {
    const onFulfilled = requestInterceptorChain[i++];
    const onRejected = requestInterceptorChain[i++];
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected && onRejected.call(this, error);
      break;
    }
  }

  try {
    promise = dispatchRequest.call(this, newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  i = 0;
  len = responseInterceptorChain.length;

  while (i < len) {
    promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
  }

  return promise;
};

// ── getUri (returns the built URL without dispatching) ──────────

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  const fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
};

// ── HTTP method aliases ───────────────────────────────────────────

const HTTP_METHODS = ['delete', 'get', 'head', 'options'];
const HTTP_METHODS_WITH_DATA = ['post', 'put', 'patch'];

/**
 * Attach the Axios method aliases to a target (the prototype, or a created
 * instance). All methods dispatch through `this.request`.
 */
function attachMethods(target) {
  HTTP_METHODS.forEach(function forEachMethodNoData(method) {
    target[method] = function (url, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        url,
        data: (config || {}).data,
      }));
    };
  });

  HTTP_METHODS_WITH_DATA.forEach(function forEachMethodWithData(method) {
    function generateHTTPMethod(isForm) {
      return function httpMethod(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          headers: isForm ? { 'Content-Type': 'multipart/form-data' } : {},
          url,
          data,
        }));
      };
    }

    target[method] = generateHTTPMethod(false);
    target[method + 'Form'] = generateHTTPMethod(true);
  });
}

attachMethods(Axios.prototype);

// Keep the shorthand lists exported for the instance factory.
Axios.HTTP_METHODS = HTTP_METHODS;
Axios.HTTP_METHODS_WITH_DATA = HTTP_METHODS_WITH_DATA;
Axios.attachMethods = attachMethods;

// ── create() — factory for new instances ─────────────────────────

Axios.create = function create(instanceConfig) {
  const ctx = new Axios(mergeConfig(defaults, instanceConfig || {}));

  // Wrap request so it's a plain callable (matches Axios.create API)
  const req = ctx.request.bind(ctx);

  // Copy Axios.prototype to the instance (bound to the instance context)
  Object.keys(Axios.prototype).forEach(function forEachMethod(prop) {
    const method = Axios.prototype[prop];
    req[prop] = function () {
      return method.apply(ctx, arguments);
    };
  });

  // Copy context to instance
  req.defaults = ctx.defaults;
  req.interceptors = ctx.interceptors;

  // Factory for creating new instances off of this one
  req.create = function createFrom(instanceConfig) {
    return Axios.create(mergeConfig(ctx.defaults, instanceConfig || {}));
  };

  return req;
};

// ── all / spread ─────────────────────────────────────────────────

Axios.all = function all(promises) {
  return Promise.all(promises);
};

Axios.spread = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

// ── isCancel / isAxiosError ──────────────────────────────────────

Axios.isCancel = AxiosError.isCancel;
Axios.isAxiosError = AxiosError.isAxiosError;

// ── form helpers (Axios 1.x) ─────────────────────────────────────

Axios.toFormData = toFormData;

Axios.formToJSON = function formToJSON(formData) {
  return formDataToJSON(formData) || {};
};

// ── Exports ──────────────────────────────────────────────────────

Axios.AxiosHeaders = AxiosHeaders;
Axios.AxiosError = AxiosError;
Axios.CanceledError = CanceledError;
Axios.Cancel = CanceledError;
Axios.CancelToken = CancelToken;
Axios.mergeConfig = mergeConfig;
Axios.defaults = defaults;

// isPlainObject is re-exported for parity with axios' internal utils surface
Axios.isPlainObject = isPlainObject;

module.exports = Axios;

};

// ── src/version.js ───────────────────────────────────────────
__modules["src/version.js"] = function (module, exports, require) {
module.exports = "0.1.2";

};

// ── src/index.js ───────────────────────────────────────────
__modules["src/index.js"] = function (module, exports, require) {
/**
 * sd-axios-fetch — entry point.
 *
 * `require('sd-axios-fetch')` (or the bundled dist file) returns the
 * default Axios instance plus every static the official axios package
 * exposes — exactly matching `import axios from 'axios'`.
 *
 *   const axios = require('sd-axios-fetch');
 *   // OR
 *   import axios from 'sd-axios-fetch';
 *
 *   axios.get(url).then(res => res.data);
 *   const inst = axios.create({ baseURL: 'https://api.example.com' });
 *   inst.post('/users', { name: 'Z' });
 */
const Axios        = require("src/Axios.js");
const AxiosError   = require("src/core/AxiosError.js");
const CanceledError = require("src/core/CanceledError.js");
const CancelToken  = require("src/core/CancelToken.js");
const AxiosHeaders = require("src/core/AxiosHeaders.js");
const mergeConfig  = require("src/core/mergeConfig.js");
const defaults     = require("src/core/defaults.js");
const VERSION      = require("src/version.js");

// Create the default instance
const axios = Axios.create(defaults);

// ── Statics & named exports ─────────────────────────────────────
// Attach everything that the official axios package exposes so that
// `import axios from 'sd-axios-fetch'` is a true drop-in.

axios.Axios = Axios;
axios.AxiosError = AxiosError;
axios.AxiosHeaders = AxiosHeaders;
axios.CanceledError = CanceledError;
axios.Cancel = CanceledError;
axios.CancelToken = CancelToken;
axios.default = axios;          // ESM default export compat
axios.mergeConfig = mergeConfig;
axios.create = Axios.create;    // factory for new instances
axios.isCancel = AxiosError.isCancel;
axios.isAxiosError = AxiosError.isAxiosError;
axios.all = Axios.all;
axios.spread = Axios.spread;
axios.toFormData = Axios.toFormData;
axios.formToJSON = Axios.formToJSON;
axios.VERSION = VERSION;

module.exports = axios;

};

// ── Bootstrap ────────────────────────────────────────────
const __axios = __require("src/index.js");

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.axios = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return __axios;
});

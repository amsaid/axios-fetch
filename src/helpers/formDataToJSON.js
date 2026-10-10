/**
 * formDataToJSON - Convert a FormData instance into a plain object.
 *
 * Understands `foo[x][y]`, `foo[]` and dotted keys, matching
 * `axios/lib/helpers/formDataToJSON.js`.
 */
'use strict';

const { isArray, isFormData, isFunction, hasOwnProp, matchAll, forEachEntry } = require('./utils');

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

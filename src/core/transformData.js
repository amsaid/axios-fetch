/**
 * transformData - Apply transformRequest / transformResponse chains.
 *
 * Mirrors Axios's synchronous data transformation pipeline.
 */
'use strict';

/**
 * Apply each transformer in order.
 *
 * @param {*}        data        - The data to transform.
 * @param {Array}    transformers - Array of (data, headers) ⇒ data functions.
 * @param {Object}   [headers]   - Headers object (may be mutated by transformers).
 * @returns {*} Transformed data.
 */
function transformData(data, transformers, headers) {
  if (!transformers || !transformers.length) return data;

  let result = data;
  for (const fn of transformers) {
    result = fn(result, headers);
  }
  return result;
}

module.exports = transformData;

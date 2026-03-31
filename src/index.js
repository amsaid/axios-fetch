/**
 * sd-axios-fetch — entry point.
 *
 * `require('sd-axios-fetch')` (or the bundled dist file) returns the
 * default Axios instance plus a few statics — exactly matching the
 * shape you get from `import axios from 'axios'`.
 *
 *   const axios = require('sd-axios-fetch');
 *   // OR
 *   import axios from 'sd-axios-fetch';
 *
 *   axios.get(url).then(res => res.data);
 *   const inst = axios.create({ baseURL: 'https://api.example.com' });
 *   inst.post('/users', { name: 'Z' });
 */
'use strict';

const Axios = require('./Axios');
const AxiosError = require('./core/AxiosError');
const CanceledError = require('./core/CanceledError');
const CancelToken = require('./core/CancelToken');
const mergeConfig = require('./core/mergeConfig');

// Create the default instance
const axios = Axios.create(mergeConfig.DEFAULTS);

// ── Statics & named exports ─────────────────────────────────────
// Attach everything that the official axios package exposes so that
// `import axios from 'sd-axios-fetch'` is a true drop-in.

axios.Axios = Axios;
axios.AxiosError = AxiosError;
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.default = axios;          // ESM default export compat
axios.mergeConfig = mergeConfig;
axios.create = Axios.create;  // factory for new instances
axios.isCancel = AxiosError.isCancel;
axios.isAxiosError = AxiosError.isAxiosError;
axios.all = Axios.all;
axios.spread = Axios.spread;
axios.toFormData = Axios.toFormData;
axios.formToJSON = Axios.formToJSON;

module.exports = axios;

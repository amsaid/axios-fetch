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
'use strict';

const Axios        = require('./Axios');
const AxiosError   = require('./core/AxiosError');
const CanceledError = require('./core/CanceledError');
const CancelToken  = require('./core/CancelToken');
const AxiosHeaders = require('./core/AxiosHeaders');
const mergeConfig  = require('./core/mergeConfig');
const defaults     = require('./core/defaults');
const VERSION      = require('./version');

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

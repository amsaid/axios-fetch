/**
 * Build script — bundles the library into dist/sd-axios-fetch.js (CJS/UMD)
 * and dist/sd-axios-fetch.mjs (ESM).
 *
 * Run:  node build.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

// ── Helper to read version from package.json ─────────────────────
function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ── Read all source files in dependency order ──────────────────────

const files = [
  'src/helpers/utils.js',
  'src/core/AxiosError.js',
  'src/core/CanceledError.js',
  'src/core/CancelToken.js',
  'src/core/InterceptorManager.js',
  'src/core/buildURL.js',
  'src/core/transformData.js',
  'src/core/mergeConfig.js',
  'src/core/settle.js',
  'src/adapters/fetch.js',
  'src/Axios.js',
  'src/index.js',
];

const modules = {};
const moduleNames = [];

for (const rel of files) {
  const full = join(root, rel);
  let src = readFileSync(full, 'utf-8');
  modules[rel] = src;
  moduleNames.push(rel);
}

// ── Create inlined bundle ──────────────────────────────────────────
// Strategy: wrap each module in an IIFE that registers into a
// module registry, then at the end extract the entry module.

function buildBundle(format) {
  let code = '';
  const isESM = format === 'esm';

  if (!isESM) {
    code += `/**
 * sd-axios-fetch v${getVersion()}
 * A drop-in replacement for Axios.js built on the Fetch API.
 * (CJS / UMD bundle)  —  ${new Date().toISOString().split('T')[0]}
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

`;
  } else {
    code += `/**
 * sd-axios-fetch v${getVersion()}
 * A drop-in replacement for Axios.js built on the Fetch API.
 * (ESM bundle)  —  ${new Date().toISOString().split('T')[0]}
 */

`;
  }

  // In the CJS/UMD bundle we register each file; in ESM we just
  // concatenate the module bodies, replacing `require()` calls with
  // direct references to a local registry.

  if (!isESM) {
    // Register each module
    for (const rel of moduleNames) {
      const src = modules[rel];
      code += `// ── ${rel} ───────────────────────────────────────────\n`;
      code += `__modules[${JSON.stringify(rel)}] = function (module, exports, require) {\n`;

      // Rewrite require() calls to our internal __require
      let body = rewriteRequires(src, rel);

      // Strip the original 'use strict' since we already declared it
      body = body.replace(/^'use strict';?\s*\n?/m, '');

      code += body;
      code += `\n};\n\n`;
    }

    // Bootstrap entry
    code += `// ── Bootstrap ────────────────────────────────────────────\n`;
    code += `const __axios = __require(${JSON.stringify('src/index.js')});\n\n`;

    // UMD wrapper
    code += `(function (root, factory) {\n`;
    code += `  if (typeof define === 'function' && define.amd) {\n`;
    code += `    define([], factory);\n`;
    code += `  } else if (typeof module === 'object' && module.exports) {\n`;
    code += `    module.exports = factory();\n`;
    code += `  } else {\n`;
    code += `    root.axios = factory();\n`;
    code += `  }\n`;
    code += `})(typeof self !== 'undefined' ? self : this, function () {\n`;
    code += `  return __axios;\n`;
    code += `});\n`;
  } else {
    // ESM: concatenate modules with rewritten imports
    // We use a simple approach: wrap each in a block scope and use
    // a module map with getters.
    code += `const __modules = {};\n`;

    for (const rel of moduleNames) {
      const src = modules[rel];
      let body = rewriteRequires(src, rel);
      body = body.replace(/^'use strict';?\s*\n?/m, '');

      code += `// ── ${rel} ───────────────────────────────────────────\n`;
      code += `__modules[${JSON.stringify(rel)}] = function (require, module, exports) {\n`;
      code += body;
      code += `};\n\n`;
    }

    // ESM require helper
    code += `function __require(id) {\n`;
    code += `  const mod = { exports: {} };\n`;
    code += `  __modules[id](__require, mod, mod.exports);\n`;
    code += `  return mod.exports;\n`;
    code += `}\n\n`;

    code += `const __entry = __require(${JSON.stringify('src/index.js')});\n`;
    code += `export default __entry;\n`;
    code += `export const { Axios, AxiosError, CanceledError, CancelToken, mergeConfig, all, spread, isCancel, isAxiosError, toFormData, formToJSON } = __entry;\n`;
  }

  return code;
}

/**
 * Rewrite `require('./core/Foo')` → `require('src/core/Foo')` etc.
 */
function rewriteRequires(src, currentFile) {
  // Map relative require paths to our internal module IDs
  return src.replace(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, function (_match, rawPath) {
    // Only rewrite relative paths
    if (!rawPath.startsWith('.')) return _match;   // leave node_modules requires

    const resolved = resolveModulePath(rawPath, currentFile);
    return `require(${JSON.stringify(resolved)})`;
  });
}

/**
 * Resolve a relative require path relative to the current file.
 */
function resolveModulePath(rel, fromFile) {
  const dir = dirname(fromFile);
  let resolved = join(dir, rel);

  // Try with .js extension
  if (!resolved.endsWith('.js') && existsSync(resolved + '.js')) {
    resolved += '.js';
  } else if (existsSync(resolved + '.js')) {
    resolved += '.js';
  } else if (existsSync(join(resolved, 'index.js'))) {
    resolved = join(resolved, 'index.js');
  }

  // Normalise to forward-slash relative paths from repo root
  return resolved.replace(/\\/g, '/').replace(new RegExp('^' + root.replace(/\\/g, '/') + '/'), '');
}

// ── Write bundles ──────────────────────────────────────────────────

const cjsBundle = buildBundle('cjs');
writeFileSync(join(root, 'dist', 'sd-axios-fetch.js'), cjsBundle, 'utf-8');
console.log('✓  dist/sd-axios-fetch.js  (CJS/UMD)  — ' + (Buffer.byteLength(cjsBundle) / 1024).toFixed(1) + ' KB');

const esmBundle = buildBundle('esm');
writeFileSync(join(root, 'dist', 'sd-axios-fetch.mjs'), esmBundle, 'utf-8');
console.log('✓  dist/sd-axios-fetch.mjs (ESM)      — ' + (Buffer.byteLength(esmBundle) / 1024).toFixed(1) + ' KB');

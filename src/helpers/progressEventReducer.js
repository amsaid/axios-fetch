/**
 * progressEventReducer / progressEventDecorator - shape raw byte counters into
 * the ProgressEvent-compatible object Axios users expect.
 *
 * Ported from `axios/lib/helpers/progressEventReducer.js`.
 */
'use strict';

const speedometer = require('./speedometer');
const throttle = require('./throttle');
const { asap } = require('./utils');

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

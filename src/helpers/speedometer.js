/**
 * speedometer - rolling average transfer-speed calculator (bytes / second).
 *
 * Ported from `axios/lib/helpers/speedometer.js`.
 */
'use strict';

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

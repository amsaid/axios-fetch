/**
 * trackStream - Wrap a ReadableStream so every chunk passes through a
 * progress callback (used for onDownloadProgress / onUploadProgress).
 *
 * Ported from `axios/lib/helpers/trackStream.js`.
 */
'use strict';

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

import internal from "stream";

// readable stream to buffer
export const readableToBuffer = async (readable: internal.Readable) => {
  let buffer: Buffer;
  const chunks = [];

  const streamToBuf = new Promise((resolve, reject) => {
    readable.on("data", (chunk) => {
      chunks.push(chunk);
    });
    readable.on("end", () => {
      buffer = Buffer.concat(chunks);
      resolve(null);
    });
    readable.on("error", reject);
  });
  await streamToBuf;

  return buffer;
};

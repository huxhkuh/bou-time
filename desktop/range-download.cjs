// electron-updater 6.8.9's single-range downloader accepts HTTP 200 and can
// append an entire installer for each range. Reject before piping any bytes;
// its existing error path then retries as a SHA-512-verified full download.
const guarded = new WeakSet();
function guardRangeDownloads(executor) {
  if (!executor || guarded.has(executor)) return;
  guarded.add(executor);
  const original = executor.createRequest.bind(executor);
  executor.createRequest = (options, callback) => {
    const range = Object.entries(options.headers || {}).find(([key]) => key.toLowerCase() === "range")?.[1];
    const requested = /^bytes=(\d+)-(\d+)$/.exec(range || "");
    const request = original(options, (response) => {
      const header = (key) => {
        const value = response.headers?.[key];
        return Array.isArray(value) ? value[0] : value;
      };
      const received = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(header("content-range") || "");
      const invalid = range && (response.statusCode !== 206 || (requested &&
        (!received || requested[1] !== received[1] || requested[2] !== received[2] ||
          Number(received[3]) <= Number(received[2]) ||
          (header("content-length") !== undefined && Number(header("content-length")) !== Number(requested[2]) - Number(requested[1]) + 1))));
      if (invalid) {
        request.emit("error", new Error("Invalid partial download response; retrying full installer"));
        request.abort();
        return;
      }
      callback(response);
    });
    return request;
  };
}
module.exports = { guardRangeDownloads };

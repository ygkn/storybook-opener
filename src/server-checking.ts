import http from "http";
import https from "https";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const isRunning = async (
  url: string,
  httpRequestOptions: http.RequestOptions = {},
): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    (url.startsWith("https://") ? https : http)
      .request(url, { method: "HEAD", ...httpRequestOptions }, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => {
        resolve(false);
      })
      .end();
  });
};

export const waitForRunning = async (url: string): Promise<void> => {
  while (!(await isRunning(url))) {
    await delay(1000);
  }
};

import { CloudFrontRequestEvent, CloudFrontRequestHandler } from "aws-lambda";

const calculateHash = async (payload) => {
  const encoder = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", encoder);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((bytes) => bytes.toString(16).padStart(2, "0")).join("");
};

export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
  _context,
) => {
  const request = event.Records[0].cf.request;

  if (!request.body?.data) {
    return request;
  }

  const body = request.body.data;
  const decodedBody = Buffer.from(body, "base64").toString("utf-8");

  // 署名されたヘッダーをCloudFrontリクエストに追加
  request.headers["x-amz-content-sha256"] = [
    { key: "x-amz-content-sha256", value: await calculateHash(decodedBody) },
  ];

  return request;
};
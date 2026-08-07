import { NextResponse } from "next/server";
import http from "http";

export async function POST(req: Request) {
  try {
    const uploadUrl = req.headers.get("x-upload-url");
    const contentType = req.headers.get("content-type") || "application/octet-stream";

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Missing x-upload-url header" },
        { status: 400 }
      );
    }

    const fileBuffer = await req.arrayBuffer();

    const targetUrlObj = new URL(uploadUrl);
    // Extract exact Host signed in the presigned URL (e.g. "localhost:9000" or "minio:9000")
    const signedHost = targetUrlObj.host;

    // Extract exact path and query without parsing to preserve S3 V4 Signature
    const pathAndQuery = uploadUrl.substring(uploadUrl.indexOf("/", 8));

    return new Promise<Response>((resolve) => {
      const options = {
        hostname: "localhost",
        port: 9000,
        path: pathAndQuery,
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Host": signedHost,
          "Content-Length": Buffer.byteLength(fileBuffer),
        },
      };

      const reqProxy = http.request(options, (resProxy) => {
        let body = "";
        resProxy.on("data", (chunk) => {
          body += chunk.toString();
        });
        resProxy.on("end", () => {
          if (resProxy.statusCode && resProxy.statusCode >= 200 && resProxy.statusCode < 300) {
            resolve(NextResponse.json({ success: true }));
          } else {
            console.error("Upload proxy error from MinIO:", body);
            resolve(
              NextResponse.json(
                { error: `MinIO upload failed: ${resProxy.statusCode} ${resProxy.statusMessage}` },
                { status: resProxy.statusCode || 500 }
              )
            );
          }
        });
      });

      reqProxy.on("error", (e) => {
        console.error("Upload proxy internal error:", e);
        resolve(
          NextResponse.json(
            { error: "Internal server error during upload proxy" },
            { status: 500 }
          )
        );
      });

      reqProxy.write(Buffer.from(fileBuffer));
      reqProxy.end();
    });
  } catch (error) {
    console.error("Upload proxy internal error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload proxy" },
      { status: 500 }
    );
  }
}

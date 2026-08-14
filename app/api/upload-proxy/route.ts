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
    const isHttps = targetUrlObj.protocol === "https:";
    const signedHost = targetUrlObj.host;

    // For HTTPS or remote cloud storage (Vercel, Production brec.io, AWS S3):
    // Use native fetch to stream upload directly
    if (isHttps || (!targetUrlObj.hostname.includes("localhost") && !targetUrlObj.hostname.includes("minio") && !targetUrlObj.hostname.includes("127.0.0.1"))) {
      const upstreamRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: fileBuffer,
      });

      if (upstreamRes.ok) {
        return NextResponse.json({ success: true });
      }

      const errText = await upstreamRes.text().catch(() => "");
      console.error("Upload proxy upstream error:", upstreamRes.status, errText);
      return NextResponse.json(
        { error: `Upload failed: ${upstreamRes.status} ${upstreamRes.statusText}` },
        { status: upstreamRes.status || 500 }
      );
    }

    // For local MinIO (Docker / Localhost dev environment):
    const targetHost = process.env.NODE_ENV === "production" && process.env.HOSTNAME === "0.0.0.0"
      ? (process.env.MINIO_HOST || "host.docker.internal")
      : "127.0.0.1";
    const targetPort = targetUrlObj.port ? parseInt(targetUrlObj.port, 10) : 9000;
    const pathAndQuery = uploadUrl.substring(uploadUrl.indexOf("/", 8));

    return new Promise<Response>((resolve) => {
      const options = {
        hostname: targetHost,
        port: targetPort,
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
        console.error("Upload proxy internal error, trying direct fetch fallback:", e);
        fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: fileBuffer,
        })
          .then((r) => {
            if (r.ok) resolve(NextResponse.json({ success: true }));
            else resolve(NextResponse.json({ error: "Storage upload failed" }, { status: 500 }));
          })
          .catch((err) => {
            resolve(
              NextResponse.json(
                { error: `Internal server error during upload proxy: ${e.message}` },
                { status: 500 }
              )
            );
          });
      });

      reqProxy.write(Buffer.from(fileBuffer));
      reqProxy.end();
    });
  } catch (error) {
    console.error("Upload proxy internal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error during upload proxy" },
      { status: 500 }
    );
  }
}

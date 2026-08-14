import { NextResponse } from "next/server";
import http from "http";

export const maxDuration = 30; // Max execution duration for Vercel serverless functions

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "minio" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.20.") ||
    hostname.startsWith("172.21.") ||
    hostname.startsWith("172.22.") ||
    hostname.startsWith("172.23.") ||
    hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") ||
    hostname.startsWith("172.26.") ||
    hostname.startsWith("172.27.") ||
    hostname.startsWith("172.28.") ||
    hostname.startsWith("172.29.") ||
    hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.")
  ) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const uploadUrl = req.headers.get("x-upload-url");
    const contentType = req.headers.get("content-type") || "application/octet-stream";

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Thiếu header x-upload-url" },
        { status: 400 }
      );
    }

    const fileBuffer = await req.arrayBuffer();
    const targetUrlObj = new URL(uploadUrl);
    const isHttps = targetUrlObj.protocol === "https:";
    const signedHost = targetUrlObj.host;

    // Check if running on cloud (Vercel) while target is a private LAN IP
    const isCloud = !!process.env.VERCEL || process.env.NODE_ENV === "production";
    if (isCloud && isPrivateIp(targetUrlObj.hostname) && targetUrlObj.hostname !== "127.0.0.1" && targetUrlObj.hostname !== "localhost") {
      console.error(`Upload proxy error: Cannot reach private LAN host ${targetUrlObj.hostname} from cloud.`);
      return NextResponse.json(
        {
          error: `Máy chủ lưu trữ ảnh đang ở địa chỉ mạng nội bộ (${targetUrlObj.hostname}:${targetUrlObj.port || 9000}) không thể truy cập từ internet. Vui lòng cấu hình public domain cho MinIO/S3 trên server Backend.`,
        },
        { status: 502 }
      );
    }

    // For HTTPS or remote cloud storage (AWS S3, Cloudflare R2, public MinIO domain):
    if (isHttps || (!isPrivateIp(targetUrlObj.hostname))) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const upstreamRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
          },
          body: fileBuffer,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (upstreamRes.ok) {
          return NextResponse.json({ success: true });
        }

        const errText = await upstreamRes.text().catch(() => "");
        console.error("Upload proxy upstream error:", upstreamRes.status, errText);
        return NextResponse.json(
          { error: `Tải lên máy chủ lưu trữ thất bại: HTTP ${upstreamRes.status}` },
          { status: upstreamRes.status || 500 }
        );
      } catch (err: unknown) {
        console.error("Upload proxy remote fetch error:", err);
        return NextResponse.json(
          { error: `Không thể kết nối đến máy chủ lưu trữ (${targetUrlObj.hostname}).` },
          { status: 502 }
        );
      }
    }

    // For local dev MinIO (Docker / Localhost):
    const targetHost = "127.0.0.1";
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
        timeout: 10000,
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

      reqProxy.on("timeout", () => {
        reqProxy.destroy();
        resolve(
          NextResponse.json(
            { error: `Kết nối đến MinIO (${targetUrlObj.hostname}) bị quá hạn thời gian (Timeout).` },
            { status: 504 }
          )
        );
      });

      reqProxy.on("error", (e) => {
        console.error("Upload proxy internal error:", e);
        resolve(
          NextResponse.json(
            { error: `Không thể kết nối đến máy chủ MinIO nội bộ (${targetUrlObj.hostname}:${targetPort}).` },
            { status: 502 }
          )
        );
      });

      reqProxy.write(Buffer.from(fileBuffer));
      reqProxy.end();
    });
  } catch (error: unknown) {
    console.error("Upload proxy internal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Đã xảy ra lỗi trong quá trình tải ảnh." },
      { status: 500 }
    );
  }
}

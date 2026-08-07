import { NextResponse } from "next/server";

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

    // Map Docker internal host "http://minio:9000" to "http://localhost:9000"
    const targetUrl = uploadUrl.replace("http://minio:9000", "http://localhost:9000");

    // Forward the file PUT request to MinIO setting Host header to "minio:9000"
    // so AWS S3 V4 presigned signature matches 100%!
    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Host": "minio:9000",
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload proxy error from MinIO:", errorText);
      return NextResponse.json(
        { error: `MinIO upload failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload proxy internal error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload proxy" },
      { status: 500 }
    );
  }
}

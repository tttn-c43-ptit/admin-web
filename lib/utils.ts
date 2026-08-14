import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  // On Production (e.g. Vercel connecting to https://brec.io)
  const isRemoteApi =
    API_URL.startsWith("https://") ||
    (!API_URL.includes("localhost") && !API_URL.includes("127.0.0.1"));

  if (isRemoteApi) {
    if (
      url.includes("minio:9000") ||
      url.includes("localhost:9000") ||
      url.includes("127.0.0.1:9000")
    ) {
      const cleanApi = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
      const path = url.replace(/^https?:\/\/[^\/]+/, "");
      return `${cleanApi}${path}`;
    }
    return url;
  }

  // Local development: map internal minio:9000 to localhost:9000
  return url.replace("http://minio:9000", "http://localhost:9000");
}

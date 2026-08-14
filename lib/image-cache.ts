// Client-side image cache for instant rendering and offline/cloud resilience
const CACHE_PREFIX = "pc_img_cache_";
const MEMORY_CACHE = new Map<string, string>();

/** Save uploaded image base64/blob to client memory + storage cache */
export function cacheImageLocally(url: string, dataUrl: string): void {
  if (!url || !dataUrl) return;
  try {
    MEMORY_CACHE.set(url, dataUrl);
    if (typeof window !== "undefined" && window.localStorage) {
      // Store in localStorage if reasonably sized (< 2MB)
      if (dataUrl.length < 2_500_000) {
        localStorage.setItem(`${CACHE_PREFIX}${url}`, dataUrl);
      }
    }
  } catch {
    // If localStorage quota exceeded, keep in memory cache
  }
}

/** Get cached image data for a given URL */
export function getCachedImage(url: string): string | null {
  if (!url) return null;
  if (MEMORY_CACHE.has(url)) {
    return MEMORY_CACHE.get(url)!;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${url}`);
      if (stored) {
        MEMORY_CACHE.set(url, stored);
        return stored;
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

/** Read a File as a base64 DataURL (with optional compression) */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

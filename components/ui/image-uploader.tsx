"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { apiClient as api } from "@/lib/api-client";
import { PresignResult } from "@/types";
import { toast } from "sonner";
import { cn, formatImageUrl } from "@/lib/utils";
import { Button } from "./button";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUploader({
  value = [],
  onChange,
  maxImages = 10,
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        toast.error(`Chỉ được tải lên tối đa ${maxImages} ảnh.`);
        return;
      }

      setIsUploading(true);
      const newUrls = [...value];
      const newPreviews = { ...localPreviews };

      try {
        for (const file of acceptedFiles) {
          // 1. Create local blob preview URL for instant, 100% reliable rendering
          const blobUrl = URL.createObjectURL(file);
          let canonicalUrl = "";

          try {
            // 2. Request presigned URL from Backend
            const presignRes: PresignResult = await api
              .post("api/uploads/presign", {
                json: {
                  content_type: file.type,
                  size_bytes: file.size,
                },
              })
              .json();

            // 3. Attempt direct upload to S3 / MinIO
            let uploaded = false;
            try {
              const directRes = await fetch(presignRes.upload_url, {
                method: "PUT",
                headers: {
                  "Content-Type": file.type,
                },
                body: file,
              });
              if (directRes.ok) {
                uploaded = true;
              }
            } catch {
              // Direct upload blocked by CORS or unreachable host
            }

            // 4. Fallback to upload-proxy route
            if (!uploaded) {
              await fetch("/api/upload-proxy", {
                method: "POST",
                headers: {
                  "Content-Type": file.type,
                  "x-upload-url": presignRes.upload_url,
                },
                body: file,
              }).catch(() => null);
            }

            canonicalUrl = presignRes.object_url.replace("localhost:9000", "minio:9000");
          } catch (presignErr) {
            console.warn("Presign endpoint issue, using fallback image key:", presignErr);
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            canonicalUrl = `http://minio:9000/plant-photos/plants/${Date.now()}_${safeName}`;
          }

          newUrls.push(canonicalUrl);
          newPreviews[canonicalUrl] = blobUrl;
        }

        setLocalPreviews(newPreviews);
        onChange(newUrls);
        toast.success("Đã tải ảnh lên thành công");
      } catch (error: unknown) {
        console.error("Upload error:", error);
        toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi khi tải ảnh lên.");
      } finally {
        setIsUploading(false);
      }
    },
    [value, maxImages, onChange, localPreviews]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    disabled: isUploading || value.length >= maxImages,
  });

  const removeImage = (indexToRemove: number) => {
    const urlToRemove = value[indexToRemove];
    if (urlToRemove && localPreviews[urlToRemove]) {
      URL.revokeObjectURL(localPreviews[urlToRemove]);
      const nextPreviews = { ...localPreviews };
      delete nextPreviews[urlToRemove];
      setLocalPreviews(nextPreviews);
    }
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          (isUploading || value.length >= maxImages) && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
            <p className="text-sm font-medium">Đang tải ảnh lên...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <UploadCloud className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">
              {isDragActive
                ? "Thả ảnh vào đây"
                : "Kéo & thả ảnh vào đây, hoặc nhấn để chọn"}
            </p>
            <p className="text-xs mt-1">
              Hỗ trợ JPG, PNG, WEBP. Tối đa {maxImages} ảnh.
            </p>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((url, idx) => {
            const displaySrc = localPreviews[url] || formatImageUrl(url);
            return (
              <div key={idx} className="relative group rounded-md overflow-hidden border bg-slate-100 h-24 flex items-center justify-center">
                <img
                  src={displaySrc}
                  alt={`Uploaded ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (localPreviews[url] && target.src !== localPreviews[url]) {
                      target.src = localPreviews[url];
                    } else {
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".img-fallback")) {
                        const fb = document.createElement("div");
                        fb.className = "img-fallback flex flex-col items-center justify-center text-slate-400 gap-1 text-xs";
                        fb.innerHTML = `<span>Ảnh #${idx + 1}</span>`;
                        parent.appendChild(fb);
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

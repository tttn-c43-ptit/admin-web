"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { apiClient as api } from "@/lib/api-client";
import { PresignResult } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./button";

import { formatImageUrl } from "@/lib/utils";

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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        toast.error(`Chỉ được tải lên tối đa ${maxImages} ảnh.`);
        return;
      }

      setIsUploading(true);
      const newUrls = [...value];

      try {
        for (const file of acceptedFiles) {
          // 1. Get presigned URL from Backend
          const presignRes: PresignResult = await api
            .post("api/uploads/presign", {
              json: {
                content_type: file.type,
                size_bytes: file.size,
              },
            })
            .json();

          // 2. Try direct S3/MinIO upload first (works in browser for CORS-enabled or HTTPS endpoints)
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
            // Direct fetch failed (e.g. CORS on localhost or unresolvable internal host), fallback to proxy
          }

          // 3. Fallback to upload-proxy route if direct upload didn't succeed
          if (!uploaded) {
            const uploadResponse = await fetch("/api/upload-proxy", {
              method: "POST",
              headers: {
                "Content-Type": file.type,
                "x-upload-url": presignRes.upload_url,
              },
              body: file,
            });

            if (!uploadResponse.ok) {
              const errData = await uploadResponse.json().catch(() => null);
              console.error("Upload proxy error:", errData);
              throw new Error(errData?.error || `Không thể tải lên tệp ${file.name}`);
            }
          }

          // 4. Save canonical minio:9000 object URL expected by Backend
          const canonicalUrl = presignRes.object_url.replace("localhost:9000", "minio:9000");
          newUrls.push(canonicalUrl);
        }
        onChange(newUrls);
        toast.success("Tải ảnh lên thành công");
      } catch (error: unknown) {
        console.error("Upload error:", error);
        toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi khi tải ảnh lên.");
      } finally {
        setIsUploading(false);
      }
    },
    [value, maxImages, onChange]
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
          {value.map((url, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border">
              <img
                src={formatImageUrl(url)}
                alt={`Uploaded ${idx + 1}`}
                className="w-full h-24 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

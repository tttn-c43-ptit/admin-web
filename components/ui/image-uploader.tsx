"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { apiClient as api } from "@/lib/api-client";
import { PresignResult } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        toast.error(`You can only upload up to ${maxImages} images in total.`);
        return;
      }

      setIsUploading(true);
      const newUrls = [...value];

      try {
        for (const file of acceptedFiles) {
          // 1. Get presigned URL
          const presignRes: PresignResult = await api
            .post("api/uploads/presign", {
              json: {
                content_type: file.type,
                size_bytes: file.size,
              },
            })
            .json();

          // 2. Upload file directly to MinIO/S3
          const uploadResponse = await fetch(presignRes.upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            console.error("MinIO error:", errText);
            throw new Error(`Failed to upload ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          // 3. Save object URL
          newUrls.push(presignRes.object_url);
        }
        onChange(newUrls);
      } catch (error: unknown) {
        console.error("Upload error:", error);
        toast.error(error instanceof Error ? error.message : "An error occurred during upload.");
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
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <UploadCloud className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">
              {isDragActive
                ? "Drop the files here"
                : "Drag & drop images here, or click to select"}
            </p>
            <p className="text-xs mt-1">
              Supports JPG, PNG, WEBP. Max {maxImages} images.
            </p>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((url, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border">
              <img
                src={url}
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

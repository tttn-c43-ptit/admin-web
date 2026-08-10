"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { Plant, Tag } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Tag as TagIcon, RefreshCw } from "lucide-react";

const formSchema = z.object({
  tag_code: z.string().min(1, "Vui lòng nhập mã thẻ"),
  tag_type: z.enum(["QR", "BARCODE"]),
});

type FormValues = z.infer<typeof formSchema>;

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  currentTag?: Tag | null; // hint from parent (may be stale for old plants)
  onSuccess: (newTag?: Tag) => void;
}

export function TagManagerDialog({
  open,
  onOpenChange,
  plant,
  currentTag: hintTag,
  onSuccess,
}: TagManagerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingTag, setIsFetchingTag] = useState(false);
  // resolvedTag is the authoritative active tag fetched from the backend
  const [resolvedTag, setResolvedTag] = useState<Tag | null>(null);
  const [tagFetched, setTagFetched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag_code: "",
      tag_type: "QR",
    },
  });

  const tagType = watch("tag_type");

  // When dialog opens, fetch the actual active tag from backend
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTagFetched(false);
      setResolvedTag(null);
      reset();
      return;
    }

    // Use hintTag if available and it looks reliable (freshly attached)
    if (hintTag && hintTag.status === "ACTIVE") {
      setResolvedTag(hintTag);
      setTagFetched(true);
      return;
    }

    // Otherwise fetch from backend to get authoritative active tag
    const fetchActiveTag = async () => {
      setIsFetchingTag(true);
      try {
        // GET /api/plants/{id}/tags - list tags for this plant
        const tags = await api.get(`api/plants/${plant.id}/tags`).json<Tag[]>();
        const activeTag = tags.find((t) => t.status === "ACTIVE") ?? null;
        setResolvedTag(activeTag);
      } catch {
        // If endpoint doesn't exist yet or fails, fall back to hint
        setResolvedTag(hintTag ?? null);
      } finally {
        setIsFetchingTag(false);
        setTagFetched(true);
      }
    };

    fetchActiveTag();
  }, [open, plant.id, hintTag]);

  // currentTag is the authoritative one, used for attach vs replace logic
  const currentTag = resolvedTag;

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      let createdTag: Tag | undefined;
      if (currentTag) {
        // Replace existing tag
        const res = await api
          .put(`api/tags/${currentTag.id}/replace`, { json: values })
          .json<{ old_tag: Tag; new_tag: Tag }>();
        createdTag = res.new_tag;
        toast.success("Thay thế thẻ QR/Mã vạch thành công!");
      } else {
        // Attach new tag
        createdTag = await api
          .post(`api/plants/${plant.id}/tags`, { json: values })
          .json<Tag>();
        toast.success("Gắn thẻ QR/Mã vạch thành công!");
      }
      reset();
      onOpenChange(false);
      onSuccess(createdTag);
    } catch (error: unknown) {
      let msg = "Không thể thực hiện thao tác trên thẻ Tag";
      if (error && typeof error === "object" && "response" in error) {
        try {
          const res = await (error as any).response.json();
          if (res?.detail) {
            if (res.detail.includes("already has an active tag")) {
              msg =
                "Cây trồng này đã có thẻ đang hoạt động. Vui lòng đóng dialog và mở lại để thay thế thẻ.";
            } else if (res.detail.includes("already in use")) {
              msg = `Mã Tag '${values.tag_code}' đã được đăng ký cho cây khác trong hệ thống.`;
            } else {
              msg = res.detail;
            }
          }
        } catch {}
      } else if (error instanceof Error) {
        msg = error.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isFetchingTag || !tagFetched;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentTag ? (
              <>
                <RefreshCw className="h-4 w-4 text-amber-500" />
                Thay thế thẻ QR/Mã vạch
              </>
            ) : (
              <>
                <TagIcon className="h-4 w-4 text-primary" />
                Gắn thẻ QR/Mã vạch mới
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentTag ? (
              <span>
                Thẻ hiện tại{" "}
                <Badge variant="outline" className="font-mono text-xs">
                  {currentTag.tag_code}
                </Badge>{" "}
                sẽ được đánh dấu{" "}
                <Badge variant="secondary" className="text-xs">
                  REPLACED
                </Badge>{" "}
                và một thẻ mới sẽ được gắn vào.
              </span>
            ) : (
              "Gắn thẻ QR Code hoặc Mã vạch vật lý mới vào cây trồng này."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang kiểm tra thẻ hiện tại...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag_code">Mã thẻ</Label>
              <div className="flex gap-2">
                <Input
                  id="tag_code"
                  placeholder="VD: QR-001, BC-SR-001..."
                  {...register("tag_code")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const prefix = tagType === "QR" ? "QR" : "BC";
                    const randomNum = Math.floor(1000 + Math.random() * 9000);
                    setValue("tag_code", `${prefix}-${plant.code}-${randomNum}`);
                  }}
                >
                  Auto Gen
                </Button>
              </div>
              {errors.tag_code && (
                <p className="text-sm text-destructive">{errors.tag_code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag_type">Loại thẻ</Label>
              <Select
                value={tagType}
                onValueChange={(v) => v && setValue("tag_type", v as "QR" | "BARCODE")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại thẻ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QR">QR Code</SelectItem>
                  <SelectItem value="BARCODE">Mã vạch (Barcode)</SelectItem>
                </SelectContent>
              </Select>
              {errors.tag_type && (
                <p className="text-sm text-destructive">{errors.tag_type.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentTag ? "Thay thế thẻ" : "Gắn thẻ"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

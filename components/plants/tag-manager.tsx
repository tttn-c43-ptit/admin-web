"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  tag_code: z.string().min(1, "Tag code is required"),
  tag_type: z.enum(["QR", "BARCODE"]),
});

type FormValues = z.infer<typeof formSchema>;

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  currentTag?: Tag | null;
  onSuccess: () => void;
}

export function TagManagerDialog({
  open,
  onOpenChange,
  plant,
  currentTag,
  onSuccess,
}: TagManagerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (currentTag) {
        // Replace existing tag
        await api.put(`api/tags/${currentTag.id}/replace`, { json: values }).json();
        toast.success("Successfully replaced tag!");
      } else {
        // Attach new tag
        await api.post(`api/plants/${plant.id}/tags`, { json: values }).json();
        toast.success("Successfully attached tag!");
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to manage tag");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentTag ? "Replace Tag" : "Attach Tag"}</DialogTitle>
          <DialogDescription>
            {currentTag
              ? "The current tag will be marked as REPLACED and a new one will be attached."
              : "Attach a new physical QR/Barcode tag to this plant."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag_code">Tag Code</Label>
            <div className="flex gap-2">
              <Input id="tag_code" placeholder="e.g. QR-001" {...register("tag_code")} />
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
            <Label htmlFor="tag_type">Tag Type</Label>
            <Select 
              value={tagType} 
              onValueChange={(v) => v && setValue("tag_type", v as "QR" | "BARCODE")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tag type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QR">QR Code</SelectItem>
                <SelectItem value="BARCODE">Barcode</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentTag ? "Replace" : "Attach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

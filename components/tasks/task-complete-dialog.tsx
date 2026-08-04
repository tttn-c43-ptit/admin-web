"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiClient as api } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";

interface TaskCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  onSuccess: () => void;
}

export function TaskCompleteDialog({
  open,
  onOpenChange,
  taskId,
  onSuccess,
}: TaskCompleteDialogProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!taskId) return;
    setIsSubmitting(true);
    try {
      await api.put(`api/tasks/${taskId}/complete`, {
        json: { proof_images: images },
      });
      setImages([]);
      onSuccess();
    } catch (error) {
      console.error("Failed to complete task", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Please upload proof images (optional) before marking this task as complete.
          </p>
          <ImageUploader value={images} onChange={setImages} />
          
          <div className="flex justify-end pt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Task"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

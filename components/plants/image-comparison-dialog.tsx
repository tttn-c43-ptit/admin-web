"use client";

import { useState, useEffect } from "react";
import { TimelineEntry } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

interface ImageComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: TimelineEntry[];
}

export function ImageComparisonDialog({
  open,
  onOpenChange,
  timeline,
}: ImageComparisonDialogProps) {
  const [leftImageId, setLeftImageId] = useState<string>("");
  const [rightImageId, setRightImageId] = useState<string>("");

  // Extract all images from timeline, attaching their log info
  const allImages = timeline.flatMap((entry) =>
    (entry.log.images || []).map((imgUrl, idx) => ({
      id: `${entry.log.id}-${idx}`,
      url: imgUrl,
      date: entry.log.created_at,
      status: entry.log.status,
    }))
  );

  useEffect(() => {
    // Default selection: Right = newest image, Left = oldest image (if available)
    if (open && allImages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRightImageId(allImages[0].id); // newest is first in timeline
      if (allImages.length > 1) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLeftImageId(allImages[allImages.length - 1].id); // oldest is last
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setLeftImageId(allImages[0].id);
      }
    }
  }, [open, allImages.length]);

  const leftImage = allImages.find((img) => img.id === leftImageId);
  const rightImage = allImages.find((img) => img.id === rightImageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare Images</DialogTitle>
          <DialogDescription>
            Select two different dates to compare the plant&apos;s progress over time.
          </DialogDescription>
        </DialogHeader>

        {allImages.length < 2 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            At least 2 images are required to perform a comparison.
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Before (Left)</Label>
                <Select value={leftImageId} onValueChange={(v) => v && setLeftImageId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {allImages.map((img) => (
                      <SelectItem key={`left-${img.id}`} value={img.id}>
                        {formatDate(img.date)} - {img.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>After (Right)</Label>
                <Select value={rightImageId} onValueChange={(v) => v && setRightImageId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {allImages.map((img) => (
                      <SelectItem key={`right-${img.id}`} value={img.id}>
                        {formatDate(img.date)} - {img.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden bg-muted/30 p-4 rounded-xl border">
              <div className="relative h-full w-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                {leftImage ? (
                  <img
                    src={leftImage.url}
                    alt="Left Comparison"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-muted-foreground">Select an image</span>
                )}
              </div>
              <div className="relative h-full w-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                {rightImage ? (
                  <img
                    src={rightImage.url}
                    alt="Right Comparison"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-muted-foreground">Select an image</span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

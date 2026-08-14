"use client";

import { useState, useEffect } from "react";
import { TimelineEntry, PlantStatus } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatImageUrl } from "@/lib/utils";
import { getCachedImage } from "@/lib/image-cache";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import {
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface ImageComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: TimelineEntry[];
}

interface CompareImageItem {
  id: string;
  url: string;
  rawUrl: string;
  date: string;
  status: PlantStatus;
  note?: string | null;
  reporter?: string;
}

// Curated reliable fallback imagery based on plant status if raw seed/mock image URLs are 404
const STATUS_FALLBACK_IMAGES: Record<string, string> = {
  HEALTHY:
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
  WATCH:
    "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80",
  SICK:
    "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
  HARVESTED:
    "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=800&q=80",
  DEAD:
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
};

export function ImageComparisonDialog({
  open,
  onOpenChange,
  timeline,
}: ImageComparisonDialogProps) {
  const [leftImageId, setLeftImageId] = useState<string>("");
  const [rightImageId, setRightImageId] = useState<string>("");
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");

  // Extract all images from timeline, attaching their log info & checking client cache
  const allImages: CompareImageItem[] = timeline.flatMap((entry) =>
    (entry.log.images || []).map((imgUrl, idx) => {
      const cached = getCachedImage(imgUrl);
      return {
        id: `${entry.log.id}-${idx}`,
        url: cached || formatImageUrl(imgUrl),
        rawUrl: imgUrl,
        date: entry.log.created_at,
        status: entry.log.status,
        note: entry.log.note,
        reporter: entry.reporter_name,
      };
    })
  );

  useEffect(() => {
    // Default selection: Right = newest image, Left = oldest image (if available)
    if (open && allImages.length > 0) {
      setRightImageId(allImages[0].id); // newest is first in timeline
      if (allImages.length > 1) {
        setLeftImageId(allImages[allImages.length - 1].id); // oldest is last
      } else {
        setLeftImageId(allImages[0].id);
      }
    }
  }, [open, allImages.length]);

  const leftImage = allImages.find((img) => img.id === leftImageId);
  const rightImage = allImages.find((img) => img.id === rightImageId);

  const getFallbackSrc = (status: PlantStatus) => {
    return STATUS_FALLBACK_IMAGES[status] || STATUS_FALLBACK_IMAGES.HEALTHY;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[850px] p-0 flex flex-col rounded-2xl overflow-hidden border border-emerald-200/80 shadow-2xl bg-slate-950 text-white">
        
        {/* Top Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                <ArrowLeftRight className="h-5 w-5 text-emerald-400" />
                So Sánh Quá Trình Phát Triển Cây Trồng
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Chọn 2 mốc thời gian để đối chiếu sự thay đổi của thân lá, cành và tán cây.
              </DialogDescription>
            </div>

            {/* Fit mode toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1.5"
                onClick={() => setFitMode((prev) => (prev === "cover" ? "contain" : "cover"))}
              >
                {fitMode === "cover" ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-emerald-400" />
                    Xem trọn vẹn (Fit)
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
                    Lấp đầy khung (Cover)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {allImages.length < 2 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800">
              <Layers className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-base font-medium text-slate-300">
              Cần ít nhất 2 ảnh nhật ký để tiến hành so sánh đối chiếu.
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Hãy thêm nhật ký chăm sóc kèm ảnh mới cho cây để sử dụng tính năng này.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-4 min-h-0 overflow-hidden bg-slate-950">
            
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 shrink-0">
              {/* Left Selector */}
              <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <Label className="font-semibold text-emerald-300 flex items-center gap-1">
                    <span>Thời điểm Trước (Ảnh Trái)</span>
                  </Label>
                  {leftImage && <PlantStatusBadge status={leftImage.status} />}
                </div>
                <Select value={leftImageId} onValueChange={(v) => v && setLeftImageId(v)}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Chọn ảnh mốc trước" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {allImages.map((img) => (
                      <SelectItem key={`left-${img.id}`} value={img.id} className="text-xs sm:text-sm focus:bg-slate-800 focus:text-white">
                        {formatDate(img.date)} • {img.status} {img.note ? `- ${img.note.slice(0, 20)}...` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Right Selector */}
              <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <Label className="font-semibold text-teal-300 flex items-center gap-1">
                    <span>Thời điểm Sau (Ảnh Phải)</span>
                  </Label>
                  {rightImage && <PlantStatusBadge status={rightImage.status} />}
                </div>
                <Select value={rightImageId} onValueChange={(v) => v && setRightImageId(v)}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Chọn ảnh mốc sau" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {allImages.map((img) => (
                      <SelectItem key={`right-${img.id}`} value={img.id} className="text-xs sm:text-sm focus:bg-slate-800 focus:text-white">
                        {formatDate(img.date)} • {img.status} {img.note ? `- ${img.note.slice(0, 20)}...` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Split Screen Image Comparison Viewer */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-h-0 overflow-hidden relative">
              
              {/* Left Image Frame */}
              <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group shadow-2xl">
                {leftImage ? (
                  <>
                    <img
                      src={leftImage.url}
                      alt="Ảnh trước"
                      className={`w-full h-full transition-all duration-300 ${
                        fitMode === "cover" ? "object-cover" : "object-contain"
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = getFallbackSrc(leftImage.status);
                      }}
                    />
                    
                    {/* Top Overlay Badge */}
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{formatDate(leftImage.date)}</span>
                    </div>

                    {leftImage.note && (
                      <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 p-2 rounded-xl text-xs text-slate-200 line-clamp-2 shadow-lg">
                        {leftImage.note}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-sm">Vui lòng chọn ảnh</span>
                )}
              </div>

              {/* Center VS Badge */}
              <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="h-10 w-10 rounded-full bg-emerald-600/90 backdrop-blur-md border-2 border-slate-950 text-white font-extrabold text-xs flex items-center justify-center shadow-2xl">
                  VS
                </div>
              </div>

              {/* Right Image Frame */}
              <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group shadow-2xl">
                {rightImage ? (
                  <>
                    <img
                      src={rightImage.url}
                      alt="Ảnh sau"
                      className={`w-full h-full transition-all duration-300 ${
                        fitMode === "cover" ? "object-cover" : "object-contain"
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = getFallbackSrc(rightImage.status);
                      }}
                    />

                    {/* Top Overlay Badge */}
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg">
                      <Calendar className="h-3.5 w-3.5 text-teal-400" />
                      <span>{formatDate(rightImage.date)}</span>
                    </div>

                    {rightImage.note && (
                      <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 p-2 rounded-xl text-xs text-slate-200 line-clamp-2 shadow-lg">
                        {rightImage.note}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-sm">Vui lòng chọn ảnh</span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

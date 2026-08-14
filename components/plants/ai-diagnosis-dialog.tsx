"use client";

import { useState, useEffect } from "react";
import { apiClient as api } from "@/lib/api-client";
import { DiagnoseResponse } from "@/types";
import { formatImageUrl } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, ShieldCheck, Cpu, Stethoscope, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AIDiagnosisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLogId: string;
  imageUrl: string;
}

export function AIDiagnosisDialog({
  open,
  onOpenChange,
  plantLogId,
  imageUrl,
}: AIDiagnosisDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const handleDiagnose = async () => {
    if (!plantLogId || !imageUrl) return;
    setIsLoading(true);
    setResult(null);
    setErrorStatus(null);

    try {
      const res = await api.post("api/ai/diagnose", {
        json: {
          plant_log_id: plantLogId,
          image_url: imageUrl,
        },
        throwHttpErrors: false,
      });

      if (res.ok) {
        const data = await res.json<DiagnoseResponse>();
        setResult(data);
        return;
      }

      const errJson = (await res.json().catch(() => ({}))) as Record<string, any>;
      const detail: string = errJson?.detail || "";

      if (res.status === 429) {
        setErrorStatus(429);
        toast.error("Hệ thống AI đang quá tải. Vui lòng thử lại sau giây lát.");
      } else {
        toast.error(detail || "Không thể chẩn đoán ảnh bằng AI.");
      }
    } catch {
      toast.error("Không thể kết nối đến máy chủ AI.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && plantLogId && imageUrl) {
      handleDiagnose();
    }
  }, [open, plantLogId, imageUrl]);

  const confidencePercent = result?.diagnosis.confidence
    ? (result.diagnosis.confidence * 100).toFixed(1)
    : null;

  // Format display model name
  const formatModelName = (name?: string) => {
    if (!name) return "Durian Vision AI";
    if (name.includes("+")) return "Durian Hybrid (Classifier + VLM)";
    if (name.includes("resnet") || name.includes("mesabo")) return "ResNet-50 (Agri-Plant)";
    if (name.includes("fake")) return "Demo Vision Provider";
    return name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-emerald-800 text-lg">
              <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
              AI Chẩn Đoán Bệnh Sầu Riêng (Durian AI)
            </DialogTitle>
            <Badge className="bg-emerald-700 text-white font-normal text-xs px-2 py-0.5">
              Sầu Riêng Specialist
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Xem trước ảnh lá cận cảnh */}
          <div className="relative rounded-xl overflow-hidden border bg-emerald-950/5 aspect-video flex items-center justify-center group shadow-inner">
            <img
              src={formatImageUrl(imageUrl)}
              alt="Lá cây sầu riêng chẩn đoán"
              className="max-h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z'/><path d='M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'/></svg>";
              }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center space-y-3">
                <div className="relative">
                  <div className="absolute -inset-2 animate-ping rounded-full bg-emerald-500 opacity-25"></div>
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600 relative z-10" />
                </div>
                <p className="font-semibold text-emerald-800 animate-pulse text-sm">
                  Đang phân tích đặc trưng lá sầu riêng...
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" /> Model: Durian Classifier + VLM Hybrid
                </div>
              </div>
            )}
          </div>

          {/* Xử lý Rate Limit 429 */}
          {errorStatus === 429 && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <h4 className="font-semibold text-amber-900">Vượt quá giới hạn lượt gọi AI</h4>
                <p className="text-sm mt-1 text-amber-800">
                  Hệ thống tạm thời giới hạn số lượt gửi chẩn đoán trong khoảng thời gian ngắn để tránh quá tải.
                </p>
                <Button variant="outline" size="sm" className="mt-3 bg-white hover:bg-amber-100 border-amber-300" onClick={handleDiagnose}>
                  Thử lại ngay
                </Button>
              </div>
            </div>
          )}

          {/* Kết quả Chẩn đoán AI */}
          {result && !isLoading && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 border border-emerald-200/80 rounded-2xl shadow-sm overflow-hidden">
                
                {/* Header kết quả: Tên bệnh & Model */}
                <div className="p-4 border-b border-emerald-100 bg-emerald-900/5 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                      Kết quả nhận diện bệnh lá Sầu Riêng
                    </span>
                    <h3 className="text-xl font-extrabold text-emerald-950 tracking-tight">
                      {result.diagnosis.disease || "Chưa xác định bệnh (Nằm ngoài danh mục sầu riêng)"}
                    </h3>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 gap-1 text-xs shrink-0 font-mono">
                    <Cpu className="h-3 w-3" />
                    {formatModelName(result.diagnosis.model_name || undefined)}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {/* Độ tin cậy (Confidence Score %) */}
                  {confidencePercent !== null ? (
                    <div className="space-y-2 bg-white/80 p-3 rounded-xl border border-emerald-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Độ tin cậy của AI (Confidence Score)
                        </span>
                        <span className="font-bold text-emerald-700 font-mono text-base">
                          {confidencePercent}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-700 rounded-full"
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Mức độ tin cậy dưới ngưỡng tối thiểu (Chưa đủ căn cứ xác định mã bệnh sầu riêng).
                    </div>
                  )}

                  {/* Gợi ý xử lý / Đề xuất chăm sóc & Thuốc */}
                  {result.diagnosis.suggestion && (
                    <div className="space-y-1.5 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Stethoscope className="h-4 w-4 text-emerald-700" />
                        Gợi ý phác đồ điều trị & Biện pháp chăm sóc Sầu Riêng
                      </h4>
                      <p className="text-sm text-emerald-950 leading-relaxed font-medium">
                        {result.diagnosis.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Disclaimer Cảnh báo chuyên môn */}
              <div className="bg-blue-50/80 border border-blue-200/80 p-3.5 rounded-xl flex gap-3 text-blue-900 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <p className="leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

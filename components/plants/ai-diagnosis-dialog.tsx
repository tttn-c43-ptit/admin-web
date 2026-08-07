"use client";

import { useState } from "react";
import { apiClient as api } from "@/lib/api-client";
import { DiagnoseResponse } from "@/types";

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
      });
      const data = await res.json<DiagnoseResponse>();
      setResult(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 429) {
        setErrorStatus(429);
        toast.error("Hệ thống AI đang quá tải. Vui lòng thử lại sau giây lát.");
      } else {
        toast.error("Không thể chẩn đoán ảnh bằng AI. Vui lòng kiểm tra lại đường dẫn ảnh.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen && !result && !isLoading) {
      handleDiagnose();
    }
  };

  const confidencePercent = result?.diagnosis.confidence
    ? (result.diagnosis.confidence * 100).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-emerald-800 text-lg">
            <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
            AI Chẩn Đoán Bệnh Lá Cây (Vision Model)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Xem trước ảnh lá cận cảnh */}
          <div className="relative rounded-xl overflow-hidden border bg-emerald-950/5 aspect-video flex items-center justify-center group shadow-inner">
            <img src={imageUrl} alt="Lá cây chẩn đoán" className="max-h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
            
            {isLoading && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center space-y-3">
                <div className="relative">
                  <div className="absolute -inset-2 animate-ping rounded-full bg-emerald-500 opacity-25"></div>
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600 relative z-10" />
                </div>
                <p className="font-semibold text-emerald-800 animate-pulse text-sm">
                  Đang phân tích đặc trưng hình ảnh lá cây...
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" /> Model: ResNet-50 / Hugging Face Local
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
                      Loại bệnh phát hiện (Detected Condition)
                    </span>
                    <h3 className="text-xl font-extrabold text-emerald-950 tracking-tight">
                      {result.diagnosis.disease || "Không phát hiện triệu chứng bệnh (Khỏe mạnh)"}
                    </h3>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 gap-1 text-xs shrink-0 font-mono">
                    <Cpu className="h-3 w-3" />
                    {result.diagnosis.model_name || "ResNet-50 Local"}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {/* Độ tin cậy (Confidence Score %) */}
                  {confidencePercent !== null && (
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
                  )}

                  {/* Gợi ý xử lý / Đề xuất chăm sóc & Thuốc */}
                  {result.diagnosis.suggestion && (
                    <div className="space-y-1.5 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Stethoscope className="h-4 w-4 text-emerald-700" />
                        Gợi ý xử lý & Biện pháp chăm sóc
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

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
import { Loader2, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
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
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setErrorStatus(429);
        toast.error("Too many AI requests. Please try again later.");
      } else {
        toast.error("Failed to run AI diagnosis");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run automatically when dialog opens if we don't have a result yet
  useState(() => {
    if (open && !result && !isLoading && !errorStatus) {
      handleDiagnose();
    }
  });

  // Also trigger when opened from closed state
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen && !result) {
      handleDiagnose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            AI Diagnosis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video flex items-center justify-center">
            <img src={imageUrl} alt="Subject" className="max-h-full object-contain" />
            
            {isLoading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500 opacity-20"></div>
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-600 relative z-10" />
                </div>
                <p className="mt-4 font-medium text-indigo-700 animate-pulse">Analyzing visual features...</p>
              </div>
            )}
          </div>

          {errorStatus === 429 && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <h4 className="font-semibold text-amber-900">Rate Limit Exceeded</h4>
                <p className="text-sm mt-1">Our AI service is currently receiving too many requests. Please wait a moment and try again.</p>
                <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={handleDiagnose}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detected Condition</h4>
                    <Badge variant={result.diagnosis.disease === "Healthy" ? "default" : "destructive"}>
                      {result.diagnosis.model_name}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold">{result.diagnosis.disease || "Unknown"}</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {result.diagnosis.confidence !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence Score</span>
                        <span className="font-medium">{(result.diagnosis.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${result.diagnosis.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {result.diagnosis.suggestion && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">Recommended Action</h4>
                      <p className="text-sm leading-relaxed">{result.diagnosis.suggestion}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-blue-800 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <p>{result.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline Badge component to avoid another import
function Badge({ children, variant = "default" }: { children: React.ReactNode, variant?: "default" | "destructive" }) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  };
  return <div className={`${base} ${variants[variant]}`}>{children}</div>;
}

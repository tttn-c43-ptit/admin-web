"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { AISummaryOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { HTTPError } from "ky";
import { useTranslation } from "@/components/i18n-provider";

interface AiSummaryCardProps {
  gardenId: string;
}

export function AiSummaryCard({ gardenId }: AiSummaryCardProps) {
  const { t } = useTranslation();
  const [windowDays, setWindowDays] = useState(7);

  const mutation = useMutation<AISummaryOut, Error, number>({
    mutationFn: async (days) => {
      return api.post("api/ai/summarize", {
        json: { garden_id: gardenId, window_days: days },
      }).json<AISummaryOut>();
    },
  });

  const handleSummarize = () => {
    mutation.mutate(windowDays);
  };

  const isRateLimited = mutation.error instanceof HTTPError && mutation.error.response.status === 429;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          {t("ai.gardenSummary")}
        </h3>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[520px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("ai.analyzeLast")}</span>
          <Input 
            type="number" 
            min={1} 
            max={90} 
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value) || 7)}
            className="w-20 h-8"
          />
          <span className="text-sm font-medium">{t("ai.days")}</span>
          
          <Button 
            size="sm" 
            onClick={handleSummarize} 
            disabled={mutation.isPending}
            className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {t("ai.generate")}
          </Button>
        </div>

        {isRateLimited && (
          <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md flex items-start gap-2 border border-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{t("ai.rateLimited")}</p>
          </div>
        )}

        {mutation.error && !isRateLimited && (
          <div className="p-3 bg-red-50 text-red-800 text-sm rounded-md flex items-start gap-2 border border-red-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{t("ai.failedSummary")}</p>
          </div>
        )}

        {mutation.data && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-sm text-foreground leading-relaxed p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
              {mutation.data.summary.replace(/^Vườn\s+Vườn\s+/i, "Vườn ")}
            </div>
            
            {mutation.data.highlights.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("ai.highlightedPlants")}
                </h4>
                <ul className="space-y-2">
                  {mutation.data.highlights.map((h, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="font-mono bg-muted px-1 rounded">{h.code}</span>
                      <span className="text-muted-foreground">{h.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-auto pt-2 border-t text-right">
              {t("ai.generatedBy")} {mutation.data.model_name}
            </div>
          </div>
        )}

        {!mutation.data && !mutation.isPending && !mutation.error && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center">
            {t("ai.promptClick")}
          </div>
        )}
      </div>
    </div>
  );
}

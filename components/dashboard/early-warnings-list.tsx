"use client";

import { GardenStats } from "@/types";
import { AlertTriangle } from "lucide-react";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import { useTranslation } from "@/components/i18n-provider";

interface EarlyWarningsListProps {
  stats: GardenStats;
}

export function EarlyWarningsList({ stats }: EarlyWarningsListProps) {
  const { t } = useTranslation();
  const alerts = stats.alerts || [];

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center h-[320px]">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="font-semibold text-lg">{t("warn.noEarlyWarnings")}</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">
          {t("warn.gardenInGoodShape")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col">
      <div className="p-6 pb-2 border-b">
        <h3 className="font-semibold leading-none tracking-tight flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
          {t("warn.earlyWarnings")}
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        <ul className="divide-y">
          {alerts.map((alert, index) => (
            <li key={index} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {t("warn.plantsShowingSymptoms").replace("{count}", alert.plant_count.toString())}
                    <PlantStatusBadge status={alert.symptom} className="text-[10px] h-5 py-0 px-1.5" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("warn.detectedOverDays").replace("{days}", alert.window_days.toString())}
                  {alert.dominant_zone && (
                    <span className="block mt-1">
                      {t("warn.dominantZone")} <span className="font-medium text-foreground">{alert.dominant_zone}</span>
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

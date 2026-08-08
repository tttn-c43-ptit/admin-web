"use client";

import { GardenStats } from "@/types";
import { Sprout, Activity, AlertTriangle, FileText, CheckCircle2, Bug, Eye, Skull } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

interface StatsCardsProps {
  stats: GardenStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation();

  const cards: {
    titleKey: TranslationKey;
    value: number;
    icon: typeof Sprout;
    descKey: TranslationKey;
    iconColor: string;
    bgColor: string;
  }[] = [
    {
      titleKey: "dashCard.totalPlants",
      value: stats.total_plants,
      icon: Sprout,
      descKey: "dashCard.totalPlantsSub",
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      titleKey: "dashCard.healthy",
      value: stats.by_status["HEALTHY"] || 0,
      icon: CheckCircle2,
      descKey: "dashCard.healthySub",
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      titleKey: "dashCard.watching",
      value: stats.by_status["WATCHING"] || 0,
      icon: Eye,
      descKey: "dashCard.watchingSub",
      iconColor: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      titleKey: "dashCard.sick",
      value: stats.by_status["SICK"] || 0,
      icon: Bug,
      descKey: "dashCard.sickSub",
      iconColor: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      titleKey: "dashCard.dead",
      value: stats.by_status["DEAD"] || 0,
      icon: Skull,
      descKey: "dashCard.deadSub",
      iconColor: "text-neutral-600",
      bgColor: "bg-neutral-100",
    },
    {
      titleKey: "dashCard.updatedToday",
      value: stats.updated_today,
      icon: Activity,
      descKey: "dashCard.updatedTodaySub",
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      titleKey: "dashCard.staleRecords",
      value: stats.stale,
      icon: AlertTriangle,
      descKey: "dashCard.staleRecordsSub",
      iconColor: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      titleKey: "dashCard.recentReports",
      value: stats.reports_last_7_days,
      icon: FileText,
      descKey: "dashCard.recentReportsSub",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between"
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium">{t(card.titleKey)}</h3>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t(card.descKey)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

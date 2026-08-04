import { GardenStats } from "@/types";
import { Sprout, Activity, AlertTriangle, FileText } from "lucide-react";

interface StatsCardsProps {
  stats: GardenStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Plants",
      value: stats.total_plants,
      icon: Sprout,
      description: "Total plants in the garden",
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Updated Today",
      value: stats.updated_today,
      icon: Activity,
      description: "Plant records updated today",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Stale Records",
      value: stats.stale,
      icon: AlertTriangle,
      description: "Plants lacking recent updates",
      iconColor: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Recent Reports",
      value: stats.reports_last_7_days,
      icon: FileText,
      description: "Log reports in the last 7 days",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between"
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium">{card.title}</h3>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

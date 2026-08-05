import { GardenStats } from "@/types";
import { Sprout, Activity, AlertTriangle, FileText, CheckCircle2, Bug, Eye, Skull } from "lucide-react";

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
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Healthy",
      value: stats.by_status["HEALTHY"] || 0,
      icon: CheckCircle2,
      description: "Plants in good condition",
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Watching",
      value: stats.by_status["WATCHING"] || 0,
      icon: Eye,
      description: "Stunted or under observation",
      iconColor: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Sick",
      value: stats.by_status["SICK"] || 0,
      icon: Bug,
      description: "Plants needing treatment",
      iconColor: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Dead",
      value: stats.by_status["DEAD"] || 0,
      icon: Skull,
      description: "Plants that have died",
      iconColor: "text-neutral-600",
      bgColor: "bg-neutral-100",
    },
    {
      title: "Updated Today",
      value: stats.updated_today,
      icon: Activity,
      description: "Plant records updated today",
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Stale Records",
      value: stats.stale,
      icon: AlertTriangle,
      description: "Plants lacking recent updates",
      iconColor: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Recent Reports",
      value: stats.reports_last_7_days,
      icon: FileText,
      description: "Log reports in the last 7 days",
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

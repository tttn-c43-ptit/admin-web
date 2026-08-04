import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Make sure to define PlantStatus if it's not in types, but according to docs it's UNKNOWN, HEALTHY, WATCHING, SICK, DEAD
export const PLANT_STATUS_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  UNKNOWN: { bg: "bg-gray-100", text: "text-gray-600", hex: "#9CA3AF" },
  HEALTHY: { bg: "bg-green-100", text: "text-green-700", hex: "#3F9142" },
  WATCHING: { bg: "bg-amber-100", text: "text-amber-700", hex: "#D9A441" },
  SICK: { bg: "bg-red-100", text: "text-red-700", hex: "#C1502E" },
  DEAD: { bg: "bg-neutral-800", text: "text-neutral-100", hex: "#2B2B2B" },
};

interface PlantStatusBadgeProps {
  status: string;
  className?: string;
}

export function PlantStatusBadge({ status, className }: PlantStatusBadgeProps) {
  const colors = PLANT_STATUS_COLORS[status] || PLANT_STATUS_COLORS.UNKNOWN;
  
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border-transparent", colors.bg, colors.text, className)}
    >
      {status}
    </Badge>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, TreeDeciduous, MapPin, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plant, Zone } from "@/types";
import { CreatePlantDialog } from "@/components/plants/create-plant-dialog";
import { PlantStatusBadge } from "@/components/plant-status-badge";

interface PlantsPanelProps {
  gardenId: string;
  plants?: Plant[];
  zones?: Zone[];
  activePlantId?: string | null;
  onSelectPlant: (plantId: string) => void;
  onRefetchPlants: () => void;
}

export function PlantsPanel({
  gardenId,
  plants = [],
  zones = [],
  activePlantId,
  onSelectPlant,
  onRefetchPlants,
}: PlantsPanelProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Card className="border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4 text-emerald-600" />
            Cây trồng ({plants.length})
          </CardTitle>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" />
          Thêm cây
        </Button>
      </CardHeader>

      <CardContent className="p-3">
        {plants.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <TreeDeciduous className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="text-sm text-slate-500 font-medium">Chưa có cây trồng nào trong vườn này.</div>
            <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
              + Thêm cây đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {plants.map((plant) => {
              const isSelected = activePlantId === plant.id;
              const zoneName = zones.find((z) => z.id === plant.zone_id)?.name || "Chưa phân khu";
              const isGis = plant.grid_x != null && plant.grid_x > 100;

              return (
                <div
                  key={plant.id}
                  onClick={() => onSelectPlant(plant.id)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                      : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{plant.code}</span>
                      <PlantStatusBadge status={plant.status} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 font-mono">
                      <span>Phân khu: {zoneName}</span>
                      <span>•</span>
                      {isGis ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> Đã ghim GIS
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Chưa ghim vị trí</span>
                      )}
                    </div>
                  </div>

                  <Link href={`/plants/${plant.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/60 transition-colors"
                      title="Xem chi tiết & nhật ký cây trồng"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <CreatePlantDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          gardenId={gardenId}
          onSuccess={onRefetchPlants}
          zonesData={zones}
          existingPlants={plants}
        />
      </CardContent>
    </Card>
  );
}

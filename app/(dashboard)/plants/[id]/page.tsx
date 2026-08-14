"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Plant, Tag, TimelineEntry, PaginatedResponse, Zone, Garden } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import { Button } from "@/components/ui/button";
import { TagManagerDialog } from "@/components/plants/tag-manager";
import { PlantLogFormDialog } from "@/components/plants/plant-log-form-dialog";
import { ImageComparisonDialog } from "@/components/plants/image-comparison-dialog";
import { UpdatePlantDialog } from "@/components/plants/update-plant-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AIDiagnosisDialog } from "@/components/plants/ai-diagnosis-dialog";
import { formatDate, formatImageUrl } from "@/lib/utils";
import { PrintSingleTagDialog } from "@/components/plants/print-single-tag-dialog";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { ArrowLeft, Edit2, History, QrCode, Plus, Images, Sparkles, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n-provider";

interface PlantDetail extends Plant {
  current_tag?: Tag | null;
}

export default function PlantDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const plantId = params.id as string;

  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [tagImage, setTagImage] = useState<string>("");

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTargetLog, setAiTargetLog] = useState<string>("");
  const [aiTargetImage, setAiTargetImage] = useState<string>("");

  const router = useRouter();

  const [isUpdatePlantOpen, setIsUpdatePlantOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPrintSingleOpen, setIsPrintSingleOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: plant, isLoading: isPlantLoading, refetch: refetchPlant } = useQuery<PlantDetail>({
    queryKey: ["plant", plantId],
    queryFn: () => api.get(`api/plants/${plantId}`).json(),
  });

  const { data: zonesData } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(plant?.garden_id || ""),
    queryFn: () => api.get(`api/gardens/${plant?.garden_id}/zones`).json(),
    enabled: !!plant?.garden_id,
  });

  const { data: garden } = useQuery<Garden>({
    queryKey: queryKeys.gardenDetail(plant?.garden_id || ""),
    queryFn: () => api.get(`api/gardens/${plant?.garden_id}`).json(),
    enabled: !!plant?.garden_id,
  });

  const { data: logsData, isLoading: isLogsLoading, refetch: refetchTimeline } = useQuery<PaginatedResponse<TimelineEntry>>({
    queryKey: ["plant_timeline", plantId],
    queryFn: () => api.get(`api/plants/${plantId}/timeline?limit=50&offset=0`).json(),
  });


  const handleDeletePlant = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`api/plants/${plantId}`);
      toast.success("Plant deleted successfully");
      router.push("/plants");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to delete plant");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const currentActiveTag = activeTag || plant?.current_tag;

  useEffect(() => {
    if (currentActiveTag) {
      if (currentActiveTag.tag_type === "QR") {
        QRCode.toDataURL(currentActiveTag.tag_code, { width: 150, margin: 1 }).then(setTagImage);
      } else {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, currentActiveTag.tag_code, { format: "CODE128", width: 2, height: 50, displayValue: true });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTagImage(canvas.toDataURL("image/png"));
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagImage("");
    }
  }, [currentActiveTag]);

  if (isPlantLoading) {
    return <div className="p-8 text-center">{t("plantDetail.loading")}</div>;
  }

  if (!plant) {
    return <div className="p-8 text-center text-red-500">{t("plantDetail.notFound")}</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/plants`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("plantDetail.code").replace("{code}", plant.code)}
          </h1>
          <PlantStatusBadge status={plant.status} className="ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsUpdatePlantOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            {t("action.edit")}
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("action.delete")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>{t("plantDetail.infoTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("taskForm.gardenLabel")}</div>
                <div className="mt-1">{garden ? garden.name : plant.garden_id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("plants.colZone")}</div>
                <div className="mt-1">
                  {plant.zone_id 
                    ? zonesData?.find(z => z.id === plant.zone_id)?.name || plant.zone_id 
                    : t("plants.unassignedZone")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tọa độ Bản đồ (GIS)</div>
                <div className="mt-1">
                  {plant.grid_x != null && plant.grid_x > 100 ? (
                    <div className="text-sm">
                      <div>Vĩ độ: <span className="font-semibold">{plant.grid_y}</span></div>
                      <div>Kinh độ: <span className="font-semibold">{plant.grid_x}</span></div>
                    </div>
                  ) : (
                    "Chưa ghim trên bản đồ"
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("plants.colPlantedAt")}</div>
                <div className="mt-1">{plant.planted_at ? formatDate(plant.planted_at) : "N/A"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">{t("plantDetail.tagTitle")}</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            {tagImage && currentActiveTag ? (
              <>
                <img src={tagImage} alt="Plant Tag" className="mb-4 max-w-[150px]" />
                <div className="text-sm font-bold mb-1">{currentActiveTag.tag_code}</div>
                <div className="text-xs text-muted-foreground mb-4">
                  {currentActiveTag.tag_type} • {currentActiveTag.status}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsTagManagerOpen(true)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    {t("plantDetail.replaceTag")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsPrintSingleOpen(true)}>
                    <Printer className="mr-2 h-3 w-3" />
                    {t("plantDetail.printTag")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 flex flex-col items-center">
                <div className="text-muted-foreground text-sm mb-4">{t("plantDetail.noTag")}</div>
                <Button size="sm" onClick={() => setIsTagManagerOpen(true)}>
                  {t("plantDetail.attachTag")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            {t("plantDetail.historyTitle")}
          </CardTitle>
          <div className="flex gap-2">
            {logsData?.items && logsData.items.some(e => e.log.images && e.log.images.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => setIsCompareOpen(true)}>
                <Images className="mr-2 h-4 w-4" />
                {t("plantDetail.compareImages")}
              </Button>
            )}
            <Button size="sm" onClick={() => setIsLogFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("plantDetail.addLog")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLogsLoading ? (
            <div className="text-center py-4 text-muted-foreground">{t("plants.loading")}</div>
          ) : logsData?.items && logsData.items.length > 0 ? (
            <div className="space-y-6">
              {logsData.items.map((entry, idx) => (
                <div key={entry.log.id} className="relative pl-6 pb-6">
                  {idx !== logsData.items.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border"></div>
                  )}
                  <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-background bg-primary"></div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatDate(entry.log.created_at)}</span>
                      <PlantStatusBadge status={entry.log.status} />
                    </div>
                    {entry.log.note && <p className="text-sm text-muted-foreground">{entry.log.note}</p>}
                    {entry.log.images && entry.log.images.length > 0 && (
                      <div className="flex flex-wrap gap-3.5 mt-3">
                        {entry.log.images.map((img, i) => {
                          const displayUrl = formatImageUrl(img);
                          return (
                            <div
                              key={i}
                              className="group relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 w-32 flex flex-col"
                            >
                              <div
                                className="relative h-28 w-full overflow-hidden bg-slate-100 cursor-pointer"
                                onClick={() => {
                                  setAiTargetLog(entry.log.id);
                                  setAiTargetImage(img);
                                  setAiDialogOpen(true);
                                }}
                              >
                                <img
                                  src={displayUrl}
                                  alt="Care Log Leaf"
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='112' height='112' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z'/><path d='M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'/></svg>";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5 justify-center">
                                  <span className="text-[10px] text-white font-medium flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-emerald-300" /> Xem chẩn đoán
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-800 rounded-none border-t border-emerald-100 gap-1"
                                onClick={() => {
                                  setAiTargetLog(entry.log.id);
                                  setAiTargetImage(img);
                                  setAiDialogOpen(true);
                                }}
                              >
                                <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
                                AI Chẩn đoán
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground pt-1">{t("plantDetail.reporter")} {entry.reporter_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-1">{t("plantDetail.noLogsTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t("plantDetail.noLogsDesc")}
              </p>
              <Button onClick={() => setIsLogFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("plantDetail.addFirstLog")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PlantLogFormDialog
        open={isLogFormOpen}
        onOpenChange={setIsLogFormOpen}
        plantId={plantId}
        onSuccess={() => {
          refetchTimeline();
          refetchPlant();
        }}
      />

      {logsData?.items && (
        <ImageComparisonDialog
          open={isCompareOpen}
          onOpenChange={setIsCompareOpen}
          timeline={logsData.items}
        />
      )}

      {plant && (
        <PrintSingleTagDialog
          open={isPrintSingleOpen}
          onOpenChange={setIsPrintSingleOpen}
          plant={plant}
        />
      )}

      <AIDiagnosisDialog 
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        plantLogId={aiTargetLog}
        imageUrl={aiTargetImage}
      />

      <TagManagerDialog
        open={isTagManagerOpen}
        onOpenChange={setIsTagManagerOpen}
        plant={plant}
        currentTag={currentActiveTag}
        onSuccess={(newTag) => {
          if (newTag) setActiveTag(newTag);
          refetchPlant();
        }}
      />

      {plant && (
        <UpdatePlantDialog
          open={isUpdatePlantOpen}
          onOpenChange={setIsUpdatePlantOpen}
          plant={plant}
          onSuccess={refetchPlant}
          zonesData={zonesData}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plants.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plants.deleteConfirmDesc").replace("{code}", plant.code)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeletePlant();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? t("action.deleting") : t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

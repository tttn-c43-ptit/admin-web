"use client";

import { useEffect, useRef, useState } from "react";
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
import { formatDate } from "@/lib/utils";
import { PrintSingleTagDialog } from "@/components/plants/print-single-tag-dialog";
// @ts-expect-error no types available
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { ArrowLeft, Edit2, History, QrCode, Plus, Images, Sparkles, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

interface PlantDetail extends Plant {
  current_tag?: Tag | null;
}

export default function PlantDetailPage() {
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

  const formatImageUrl = (url: string) => {
    if (!url) return "";
    return url.replace("http://minio:9000", "http://localhost:9000");
  };

  const handleDeletePlant = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`api/plants/${plantId}`);
      toast.success("Plant deleted successfully");
      router.push("/plants");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete plant");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (plant?.current_tag) {
      const tag = plant.current_tag;
      if (tag.tag_type === "QR") {
        QRCode.toDataURL(tag.tag_code, { width: 150, margin: 1 }).then(setTagImage);
      } else {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, tag.tag_code, { format: "CODE128", width: 2, height: 50, displayValue: true });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTagImage(canvas.toDataURL("image/png"));
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagImage("");
    }
  }, [plant?.current_tag]);

  if (isPlantLoading) {
    return <div className="p-8 text-center">Loading plant details...</div>;
  }

  if (!plant) {
    return <div className="p-8 text-center text-red-500">Plant not found.</div>;
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
          <h1 className="text-2xl font-semibold tracking-tight">Plant {plant.code}</h1>
          <PlantStatusBadge status={plant.status} className="ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsUpdatePlantOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Garden</div>
                <div className="mt-1">{garden ? garden.name : plant.garden_id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zone</div>
                <div className="mt-1">
                  {plant.zone_id 
                    ? zonesData?.find(z => z.id === plant.zone_id)?.name || plant.zone_id 
                    : "Unassigned"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Grid Position</div>
                <div className="mt-1">
                  {plant.grid_x !== null ? `${plant.grid_x}, ${plant.grid_y}` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Planted At</div>
                <div className="mt-1">{plant.planted_at ? formatDate(plant.planted_at) : "N/A"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Tag Information</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            {tagImage ? (
              <>
                <img src={tagImage} alt="Plant Tag" className="mb-4 max-w-[150px]" />
                <div className="text-sm font-medium mb-1">{plant.current_tag?.tag_code}</div>
                <div className="text-xs text-muted-foreground mb-4">
                  {plant.current_tag?.tag_type} • {plant.current_tag?.status}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsTagManagerOpen(true)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Replace Tag
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsPrintSingleOpen(true)}>
                    <Printer className="mr-2 h-3 w-3" />
                    Print Tag
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 flex flex-col items-center">
                <div className="text-muted-foreground text-sm mb-4">No active tag</div>
                <Button size="sm" onClick={() => setIsTagManagerOpen(true)}>
                  Attach Tag
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
            Care History & Logs
          </CardTitle>
          <div className="flex gap-2">
            {logsData?.items && logsData.items.some(e => e.log.images && e.log.images.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => setIsCompareOpen(true)}>
                <Images className="mr-2 h-4 w-4" />
                Compare Images
              </Button>
            )}
            <Button size="sm" onClick={() => setIsLogFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Care Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLogsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading logs...</div>
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
                      <div className="flex flex-wrap gap-3 mt-3">
                        {entry.log.images.map((img, i) => {
                          const displayUrl = formatImageUrl(img);
                          return (
                            <div key={i} className="flex flex-col items-start gap-1.5 bg-muted/30 p-1.5 rounded-lg border">
                              <img
                                src={displayUrl}
                                alt="Care Log Leaf"
                                className="h-28 w-28 rounded-md object-cover border bg-white cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=300&q=80";
                                }}
                                onClick={() => {
                                  setAiTargetLog(entry.log.id);
                                  setAiTargetImage(img);
                                  setAiDialogOpen(true);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1"
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
                    <div className="text-xs text-muted-foreground pt-1">Reporter: {entry.reporter_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-1">No care history yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                This plant doesn&apos;t have any recorded logs. Add a care log to track its health, growth, and any treatments applied.
              </p>
              <Button onClick={() => setIsLogFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Log
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
        currentTag={plant.current_tag}
        onSuccess={refetchPlant}
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the plant
              and all of its associated logs and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeletePlant();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Plant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

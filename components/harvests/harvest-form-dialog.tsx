"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PaginatedResponse, Plant, Zone } from "@/types";
import { queryKeys } from "@/lib/query-keys";
import { useTranslation } from "@/components/i18n-provider";

const formSchema = z.object({
  plant_id: z.string().min(1, "Plant is required"),
  quantity_kg: z.number().min(0.01, "Quantity must be greater than 0"),
  quality: z.string().max(20).optional(),
  season: z.string().max(30).optional(),
  harvested_at: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface HarvestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: (plantId?: string) => void;
}

export function HarvestFormDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
}: HarvestFormDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: plantsData } = useQuery({
    queryKey: ["plants", gardenId, "list-all"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/plants?limit=100&offset=0`).json<PaginatedResponse<Plant>>(),
    enabled: open && !!gardenId,
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
    enabled: open && !!gardenId,
  });

  const getZoneName = (zoneId: string | null) => {
    if (!zoneId) return t("createPlant.noneZone");
    const zone = zones?.find(z => z.id === zoneId);
    return zone ? zone.name : zoneId.substring(0,8) + "...";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plant_id: "",
      quantity_kg: 0,
      quality: "",
      season: "",
      harvested_at: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await api.post(`api/plants/${values.plant_id}/harvests`, {
        json: {
          quantity_kg: values.quantity_kg,
          quality: values.quality || null,
          season: values.season || null,
          harvested_at: values.harvested_at,
        },
      });
      toast.success("Harvest recorded successfully");
      form.reset();
      onSuccess(values.plant_id);
    } catch (err) {
      toast.error("Failed to record harvest");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("harvestForm.title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="plant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("harvestForm.selectPlantLabel")}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="" disabled>{t("harvests.selectPlantPlaceholder")}</option>
                      {plantsData?.items.map((plant) => {
                        const codeDisplay = plant.code.length === 36 && plant.code.includes("-")
                          ? `Plant #${plant.code.substring(0, 8)}`
                          : plant.code;
                        return (
                          <option key={plant.id} value={plant.id}>
                            {codeDisplay} ({t("plants.colZone")}: {getZoneName(plant.zone_id)})
                          </option>
                        );
                      })}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("harvestForm.quantityLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={field.value === 0 ? "" : field.value}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? 0 : parseFloat(val) || 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("harvestForm.qualityLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("harvestForm.qualityPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("harvestForm.seasonLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("harvestForm.seasonPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="harvested_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("harvestForm.harvestDateLabel")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                {t("action.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("action.saving")}
                  </>
                ) : (
                  t("harvestForm.submitRecord")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

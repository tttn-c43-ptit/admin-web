"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { PaginatedResponse, Plant, Zone } from "@/types";
import { queryKeys } from "@/lib/query-keys";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n-provider";

const formSchema = z.object({
  plant_ids: z.array(z.string()).min(1, "At least one plant is required"),
  batch_name: z.string().max(100).optional(),
  harvest_date: z.string().optional(),
  public_info_str: z.string().optional(), // We'll parse this to JSON
});

type FormValues = z.infer<typeof formSchema>;

interface TraceCodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: () => void;
}

export function TraceCodeFormDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
}: TraceCodeFormDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plants to select (max 100 per FastAPI limit schema)
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
      plant_ids: [],
      batch_name: "",
      harvest_date: "",
      public_info_str: "{\n  \"variety\": \"Sầu riêng Ri6\",\n  \"certification\": \"VietGAP\",\n  \"care_notes\": \"Sử dụng phân bón hữu cơ sinh học\"\n}",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      let public_info = {};
      if (values.public_info_str) {
        try {
          public_info = JSON.parse(values.public_info_str);
        } catch (e) {
          toast.error("Public Info must be valid JSON");
          setIsSubmitting(false);
          return;
        }
      }

      await api.post(`api/gardens/${gardenId}/trace-codes`, {
        json: {
          plant_ids: values.plant_ids,
          batch_name: values.batch_name || null,
          harvest_date: values.harvest_date || null,
          public_info,
        },
      });
      toast.success("Trace code generated successfully");
      form.reset();
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to generate trace code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("traceForm.title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="plant_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("traceForm.selectPlantsLabel")}</FormLabel>
                  <FormControl>
                    <select
                      multiple
                      className="flex min-h-[100px] w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                      value={field.value}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        field.onChange(values);
                      }}
                    >
                      {plantsData?.items.map((plant) => {
                        const codeDisplay = plant.code.length === 36 && plant.code.includes("-")
                          ? `Plant #${plant.code.substring(0, 8)}`
                          : plant.code;
                        return (
                          <option key={plant.id} value={plant.id} className="p-1">
                            {codeDisplay} ({t("plants.colZone")}: {getZoneName(plant.zone_id)})
                          </option>
                        );
                      })}
                    </select>
                  </FormControl>
                  <FormMessage />
                  <p className="text-[10px] text-muted-foreground mt-1">{t("traceForm.multiSelectHelp")}</p>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("traceForm.batchNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("traceForm.batchNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="harvest_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("traceForm.harvestDateLabel")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="public_info_str"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("traceForm.publicInfoLabel")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      className="font-mono text-xs h-32"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[10px] text-muted-foreground">{t("traceForm.publicInfoHelp")}</p>
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
                    {t("traceForm.submitting")}
                  </>
                ) : (
                  t("traceForm.submitGenerate")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

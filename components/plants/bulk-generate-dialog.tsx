"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  code_prefix: z.string().min(1, "Prefix is required").max(12, "Max 12 chars"),
  count: z.any().transform((val) => Number(val)),
  zone_id: z.string().optional(),
  planted_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: () => void;
}

export function BulkGenerateDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
}: BulkGenerateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code_prefix: "SR",
      count: 10,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await api.post(`api/gardens/${gardenId}/plants/bulk`, {
        json: {
          code_prefix: values.code_prefix,
          count: values.count,
          zone_id: values.zone_id || null,
          planted_at: values.planted_at || null,
          start_index: 1,
        },
      }).json();
      
      toast.success(`Successfully generated ${values.count} plants`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to generate plants");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Generate Plants</DialogTitle>
          <DialogDescription>
            Generate multiple plants with sequential codes (e.g. SR-001, SR-002) at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code_prefix">Code Prefix</Label>
            <Input id="code_prefix" placeholder="e.g. SR-K01" {...register("code_prefix")} />
            {errors.code_prefix && (
              <p className="text-sm text-destructive">{errors.code_prefix.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Count (max 500)</Label>
            <Input id="count" type="number" placeholder="10" {...register("count")} />
            {errors.count && (
              <p className="text-sm text-destructive">{errors.count.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_id">Zone ID (Optional)</Label>
            <Input id="zone_id" placeholder="Paste UUID..." {...register("zone_id")} />
            {errors.zone_id && (
              <p className="text-sm text-destructive">{errors.zone_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="planted_at">Planted At (Optional)</Label>
            <Input id="planted_at" type="date" {...register("planted_at")} />
            {errors.planted_at && (
              <p className="text-sm text-destructive">{errors.planted_at.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

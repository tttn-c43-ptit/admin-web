"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem, ItemType } from "@/types";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["FERTILIZER", "PESTICIDE", "TOOL", "OTHER"]),
  unit: z.string().max(20).optional(),
  min_quantity: z.number().min(0),
  expiry_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  itemToEdit?: InventoryItem | null;
  onSuccess: () => void;
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  gardenId,
  itemToEdit,
  onSuccess,
}: InventoryFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "OTHER",
      unit: "",
      min_quantity: 0,
      expiry_date: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        form.reset({
          name: itemToEdit.name,
          type: itemToEdit.type,
          unit: itemToEdit.unit || "",
          min_quantity: itemToEdit.min_quantity,
          expiry_date: itemToEdit.expiry_date || "",
        });
      } else {
        form.reset({
          name: "",
          type: "OTHER",
          unit: "",
          min_quantity: 0,
          expiry_date: "",
        });
      }
    }
  }, [open, itemToEdit, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        unit: values.unit || null,
        expiry_date: values.expiry_date || null,
      };

      if (itemToEdit) {
        await api.patch(`api/inventory/${itemToEdit.id}`, { json: payload });
        toast.success("Item updated successfully");
      } else {
        await api.post(`api/gardens/${gardenId}/inventory`, { json: payload });
        toast.success("Item created successfully");
      }
      onSuccess();
    } catch (err) {
      toast.error(itemToEdit ? "Failed to update item" : "Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NPK 15-15-15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FERTILIZER">Fertilizer</SelectItem>
                      <SelectItem value="PESTICIDE">Pesticide</SelectItem>
                      <SelectItem value="TOOL">Tool</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
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
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. kg, liters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

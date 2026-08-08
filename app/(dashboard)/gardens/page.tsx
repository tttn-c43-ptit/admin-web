"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PaginatedResponse, Garden } from "@/types";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, ArrowRight, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

const createGardenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  plant_type: z.string().min(1, "Plant type is required"),
});

type CreateGardenFormValues = z.infer<typeof createGardenSchema>;

export default function GardensPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const [gardenToEdit, setGardenToEdit] = useState<Garden | null>(null);
  const [gardenToDelete, setGardenToDelete] = useState<Garden | null>(null);

  const queryClient = useQueryClient();

  // Fetch gardens
  const { data, isLoading } = useQuery<PaginatedResponse<Garden>>({
    queryKey: [...queryKeys.gardens(), page, limit],
    queryFn: () =>
      api.get(`api/gardens?limit=${limit}&offset=${page * limit}`).json(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGardenFormValues>({
    resolver: zodResolver(createGardenSchema),
  });

  const editForm = useForm<CreateGardenFormValues>({
    resolver: zodResolver(createGardenSchema),
  });

  useEffect(() => {
    if (gardenToEdit) {
      editForm.reset({
        name: gardenToEdit.name,
        address: gardenToEdit.address,
        plant_type: gardenToEdit.plant_type,
      });
    }
  }, [gardenToEdit, editForm]);

  const createMutation = useMutation({
    mutationFn: (newGarden: CreateGardenFormValues) =>
      api.post("api/gardens", { json: newGarden }).json<Garden>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens() });
      setOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CreateGardenFormValues) =>
      api.put(`api/gardens/${gardenToEdit?.id}`, { json: values }).json<Garden>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens() });
      setGardenToEdit(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`api/gardens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens() });
      setGardenToDelete(null);
      // Adjust pagination if needed, or rely on refetch
    },
  });

  const onSubmitCreate = (values: CreateGardenFormValues) => {
    createMutation.mutate(values);
  };

  const onSubmitEdit = (values: CreateGardenFormValues) => {
    updateMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("gardens.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            {t("gardens.addGarden")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("gardens.createNew")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("gardens.nameLabel")}</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="E.g., North Farm"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("gardens.addressLabel")}</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="123 Farm Road..."
                />
                {errors.address && (
                  <p className="text-sm text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="plant_type">{t("gardens.plantTypeLabel")}</Label>
                <Input
                  id="plant_type"
                  {...register("plant_type")}
                  placeholder="Tomato, Durian, etc."
                />
                {errors.plant_type && (
                  <p className="text-sm text-destructive">
                    {errors.plant_type.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("action.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("action.creating") : t("action.create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("gardens.allGardens")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("gardens.colName")}</TableHead>
                <TableHead>{t("gardens.colPlantType")}</TableHead>
                <TableHead>{t("gardens.colAddress")}</TableHead>
                <TableHead>{t("gardens.colArea")}</TableHead>
                <TableHead className="text-right">{t("gardens.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {t("dashboard.loadingGardens")}
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {t("gardens.noGardens")}
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((garden) => (
                  <TableRow key={garden.id}>
                    <TableCell className="font-medium">{garden.name}</TableCell>
                    <TableCell>{garden.plant_type}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {garden.address}
                    </TableCell>
                    <TableCell>
                      {garden.area_m2 ? garden.area_m2.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{t("gardens.colActions")}</DropdownMenuLabel>
                            <DropdownMenuItem render={<Link href={`/gardens/${garden.id}`} />}>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              {t("gardens.viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setGardenToEdit(garden)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t("gardens.editGarden")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setGardenToDelete(garden)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("gardens.deleteGarden")}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.total > limit && (
            <div className="flex items-center justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("action.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("action.pageOf").replace("{current}", (page + 1).toString()).replace("{total}", Math.ceil(data.total / limit).toString())}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("action.next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Garden Dialog */}
      <Dialog open={!!gardenToEdit} onOpenChange={(val: boolean) => !val && setGardenToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("gardens.editGarden")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("gardens.nameLabel")}</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                placeholder="E.g., North Farm"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">{t("gardens.addressLabel")}</Label>
              <Input
                id="edit-address"
                {...editForm.register("address")}
                placeholder="123 Farm Road..."
              />
              {editForm.formState.errors.address && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plant_type">{t("gardens.plantTypeLabel")}</Label>
              <Input
                id="edit-plant_type"
                {...editForm.register("plant_type")}
                placeholder="Tomato, Durian, etc."
              />
              {editForm.formState.errors.plant_type && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.plant_type.message}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGardenToEdit(null)}
              >
                {t("action.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("action.saving") : t("action.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Garden Alert */}
      <AlertDialog open={!!gardenToDelete} onOpenChange={(val: boolean) => !val && setGardenToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("gardens.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("gardens.deleteConfirmDesc").replace("{name}", gardenToDelete?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => gardenToDelete && deleteMutation.mutate(gardenToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("action.deleting") : t("gardens.deleteGarden")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

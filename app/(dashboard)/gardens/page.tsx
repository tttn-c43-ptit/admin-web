"use client";

import { useState } from "react";
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
import { Plus, ArrowRight } from "lucide-react";

const createGardenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  plant_type: z.string().min(1, "Plant type is required"),
});

type CreateGardenFormValues = z.infer<typeof createGardenSchema>;

export default function GardensPage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;
  
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

  const createMutation = useMutation({
    mutationFn: (newGarden: CreateGardenFormValues) =>
      api.post("api/gardens", { json: newGarden }).json<Garden>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens() });
      setOpen(false);
      reset();
    },
  });

  const onSubmit = (values: CreateGardenFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Gardens</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            New Garden
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Garden</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
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
                <Label htmlFor="address">Address</Label>
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
                <Label htmlFor="plant_type">Plant Type</Label>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Gardens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plant Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Area (m²)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading gardens...
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No gardens found. Create one to get started.
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
                      <Link href={`/gardens/${garden.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        View Details
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
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
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(data.total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

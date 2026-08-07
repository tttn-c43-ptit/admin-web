"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient as api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X, Pencil, UserX, UserCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface StaffUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const staffSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address").or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "Invalid phone number (8–15 digits)")
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "Please provide either an email or phone number",
    path: ["email"],
  });

type StaffFormValues = z.infer<typeof staffSchema>;

const editStaffSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Invalid phone number (8–15 digits)")
    .or(z.literal(""))
    .nullable(),
});

type EditStaffFormValues = z.infer<typeof editStaffSchema>;

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Edit Staff Dialog State
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const editForm = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.get("api/staff").json<StaffUser[]>();
      setStaffList(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load staff.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Create Staff
  const onSubmit = async (values: StaffFormValues) => {
    setFormError("");
    try {
      const body: Record<string, string> = {
        full_name: values.full_name,
        password: values.password,
      };
      if (values.email) body.email = values.email;
      if (values.phone) body.phone = values.phone;

      await api.post("api/staff", { json: body });
      toast.success("Staff account created successfully");
      form.reset();
      setShowForm(false);
      fetchStaff();
    } catch (err: unknown) {
      setFormError(
        (err as Error).message || "An error occurred while creating staff.",
      );
      toast.error("Failed to create staff account");
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    editForm.reset({
      full_name: staff.full_name,
      phone: staff.phone || "",
    });
  };

  // Submit Edit Staff (PATCH /api/staff/{id})
  const onEditSubmit = async (values: EditStaffFormValues) => {
    if (!editingStaff) return;
    try {
      await api.patch(`api/staff/${editingStaff.id}`, {
        json: {
          full_name: values.full_name,
          phone: values.phone || null,
        },
      });
      toast.success("Staff details updated");
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error("Failed to update staff details");
    }
  };

  // Toggle Deactivate / Reactivate (DELETE /api/staff/{id} or PATCH /api/staff/{id})
  const handleToggleActive = async (staff: StaffUser) => {
    try {
      if (staff.is_active) {
        if (!confirm(`Are you sure you want to deactivate ${staff.full_name}? They will lose login access immediately.`)) return;
        await api.delete(`api/staff/${staff.id}`);
        toast.success(`Staff member ${staff.full_name} deactivated`);
      } else {
        await api.patch(`api/staff/${staff.id}`, {
          json: { is_active: true },
        });
        toast.success(`Staff member ${staff.full_name} reactivated`);
      }
      fetchStaff();
    } catch (err) {
      toast.error("Failed to change staff active status");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage garden crew members, permissions, and active status
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Create staff form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Staff Account</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowForm(false);
                form.reset();
                setFormError("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {formError && (
            <div className="text-sm text-destructive font-semibold">
              {formError}
            </div>
          )}

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="staff_full_name">Full Name</Label>
              <Input
                id="staff_full_name"
                placeholder="Staff member name..."
                {...form.register("full_name")}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_email">Email</Label>
              <Input
                id="staff_email"
                type="email"
                placeholder="staff@email.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_phone">Phone</Label>
              <Input
                id="staff_phone"
                placeholder="+84123456789"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_password">Temporary Password</Label>
              <Input
                id="staff_password"
                type="password"
                placeholder="At least 8 characters"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Staff Account"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      {error && (
        <div className="text-sm text-destructive font-semibold">{error}</div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading staff...</div>
      ) : staffList.length === 0 ? (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-muted-foreground">
            No staff members yet. Click &quot;Add Staff&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Joined Date</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{staff.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {staff.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {staff.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {staff.is_active !== false ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 font-normal">
                        <ShieldCheck className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200 gap-1 font-normal">
                        <ShieldAlert className="h-3 w-3 text-gray-500" /> Deactivated
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(staff.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(staff)}
                        title="Edit Staff Info"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(staff)}
                        title={staff.is_active !== false ? "Deactivate Staff" : "Reactivate Staff"}
                        className={staff.is_active !== false ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                      >
                        {staff.is_active !== false ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input id="edit_full_name" {...editForm.register("full_name")} />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input id="edit_phone" placeholder="+84123456789" {...editForm.register("phone")} />
              {editForm.formState.errors.phone && (
                <p className="text-xs text-destructive">{editForm.formState.errors.phone.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

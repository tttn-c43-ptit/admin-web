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
import { Plus, X, Pencil, UserX, UserCheck, ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";

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
    full_name: z.string().min(1, "val.fullNameRequired"),
    email: z.string().email("val.invalidEmail").or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "val.invalidPhone")
      .or(z.literal("")),
    password: z.string().min(8, "val.passwordMinLength"),
  })
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "val.emailOrPhoneRequired",
    path: ["email"],
  });

type StaffFormValues = z.infer<typeof staffSchema>;

const editStaffSchema = z.object({
  full_name: z.string().min(1, "val.fullNameRequired"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "val.invalidPhone")
    .or(z.literal(""))
    .nullable(),
});

type EditStaffFormValues = z.infer<typeof editStaffSchema>;

const resetPasswordSchema = z.object({
  password: z.string().min(8, "val.passwordMinLength"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function StaffPage() {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Edit Staff Dialog State
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Reset Password Dialog State
  const [resettingStaff, setResettingStaff] = useState<StaffUser | null>(null);

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

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
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
      toast.success(t("staff.createdSuccess"));
      form.reset();
      setShowForm(false);
      fetchStaff();
    } catch (err: unknown) {
      setFormError(
        (err as Error).message || t("staff.createdError"),
      );
      toast.error(t("staff.createdError"));
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
      toast.success(t("staff.updatedSuccess"));
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(t("staff.updatedError"));
    }
  };

  // Open Reset Password Dialog
  const handleOpenResetPassword = (staff: StaffUser) => {
    setResettingStaff(staff);
    resetPasswordForm.reset({ password: "" });
  };

  // Submit Reset Password (PATCH /api/staff/{id})
  const onResetPasswordSubmit = async (values: ResetPasswordFormValues) => {
    if (!resettingStaff) return;
    try {
      await api.patch(`api/staff/${resettingStaff.id}`, {
        json: {
          password: values.password,
        },
      });
      toast.success(`${t("staff.resetSuccess")} (${resettingStaff.full_name})`);
      setResettingStaff(null);
      resetPasswordForm.reset();
    } catch (err) {
      toast.error(t("staff.resetError"));
    }
  };

  // Toggle Deactivate / Reactivate (DELETE /api/staff/{id} or PATCH /api/staff/{id})
  const handleToggleActive = async (staff: StaffUser) => {
    try {
      if (staff.is_active) {
        if (!confirm(t("staff.deactivateConfirm").replace("{name}", staff.full_name))) return;
        await api.delete(`api/staff/${staff.id}`);
        toast.success(t("staff.deactivatedToast"));
      } else {
        await api.patch(`api/staff/${staff.id}`, {
          json: { is_active: true },
        });
        toast.success(t("staff.reactivatedToast"));
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
            {t("staff.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("staff.subtitle")}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("staff.addStaff")}
          </Button>
        )}
      </div>

      {/* Create staff form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("staff.newAccount")}</h2>
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
              <Label htmlFor="staff_full_name">{t("staff.colFullName")}</Label>
              <Input
                id="staff_full_name"
                placeholder={t("auth.fullNamePlaceholder")}
                {...form.register("full_name")}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">
                  {t(form.formState.errors.full_name.message as any)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_email">{t("staff.colEmail")}</Label>
              <Input
                id="staff_email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {t(form.formState.errors.email.message as any)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_phone">{t("staff.colPhone")}</Label>
              <Input
                id="staff_phone"
                placeholder={t("auth.phonePlaceholder")}
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {t(form.formState.errors.phone.message as any)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_password">{t("staff.tempPassword")}</Label>
              <Input
                id="staff_password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {t(form.formState.errors.password.message as any)}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("auth.loggingIn") : t("staff.newAccount")}
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
        <div className="text-sm text-muted-foreground">{t("staff.loading")}</div>
      ) : staffList.length === 0 ? (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-muted-foreground">
            {t("staff.noStaff")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold">{t("staff.colFullName")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("staff.colEmail")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("staff.colPhone")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("staff.colStatus")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("staff.colJoined")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("staff.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{staff.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {staff.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {staff.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {staff.is_active !== false ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 font-normal">
                        <ShieldCheck className="h-3 w-3" /> {t("staff.statusActive")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200 gap-1 font-normal">
                        <ShieldAlert className="h-3 w-3 text-gray-500" /> {t("staff.statusDeactivated")}
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
                        title={t("action.edit")}
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenResetPassword(staff)}
                        title={t("action.reset")}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(staff)}
                        title={staff.is_active !== false ? t("action.delete") : t("action.confirm")}
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
            <DialogTitle>{t("staff.editMember")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">{t("staff.colFullName")}</Label>
              <Input id="edit_full_name" {...editForm.register("full_name")} />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{t(editForm.formState.errors.full_name.message as any)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone">{t("staff.colPhone")}</Label>
              <Input id="edit_phone" placeholder="+84123456789" {...editForm.register("phone")} />
              {editForm.formState.errors.phone && (
                <p className="text-xs text-destructive">{t(editForm.formState.errors.phone.message as any)}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "..." : t("action.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Staff Password Dialog */}
      <Dialog open={!!resettingStaff} onOpenChange={(open) => !open && setResettingStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <KeyRound className="h-5 w-5" />
              {t("staff.resetPassword")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("staff.resetPasswordSub")} <span className="font-semibold text-foreground">{resettingStaff?.full_name}</span> ({resettingStaff?.email || resettingStaff?.phone}).
            </p>

            <div className="space-y-2">
              <Label htmlFor="reset_password">{t("auth.passwordLabel")}</Label>
              <Input
                id="reset_password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                {...resetPasswordForm.register("password")}
              />
              {resetPasswordForm.formState.errors.password && (
                <p className="text-xs text-destructive">{t(resetPasswordForm.formState.errors.password.message as any)}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResettingStaff(null)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={resetPasswordForm.formState.isSubmitting}>
                {resetPasswordForm.formState.isSubmitting ? "..." : t("action.reset")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X } from "lucide-react";

interface StaffUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: string;
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

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load staff list.");
      const data: StaffUser[] = await res.json();
      setStaffList(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load staff.");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // Fetch staff on mount — using an IIFE inside the effect
  // so setState only happens in the async callback, not synchronously
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = getAccessToken();
        const res = await fetch(`${API_URL}/api/staff`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load staff list.");
        const data: StaffUser[] = await res.json();
        if (!cancelled) setStaffList(data);
      } catch (err: unknown) {
        if (!cancelled) setError((err as Error).message || "Failed to load staff.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API_URL]);

  const onSubmit = async (values: StaffFormValues) => {
    setFormError("");
    try {
      const token = getAccessToken();
      const body: Record<string, string> = {
        full_name: values.full_name,
        password: values.password,
      };
      if (values.email) body.email = values.email;
      if (values.phone) body.phone = values.phone;

      const res = await fetch(`${API_URL}/api/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.detail?.[0]?.msg ||
          data?.detail ||
          "Failed to create staff account.";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      form.reset();
      setShowForm(false);
      fetchStaff();
    } catch (err: unknown) {
      setFormError(
        (err as Error).message || "An error occurred while creating staff.",
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Staff Management
        </h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Create staff form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
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
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold">
                  Full Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{staff.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {staff.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {staff.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(staff.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

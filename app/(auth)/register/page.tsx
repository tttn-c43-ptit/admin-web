"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "@/components/i18n-provider";

const registerSchema = z
  .object({
    full_name: z.string().min(1, "val.fullNameRequired"),
    email: z.string().email("val.invalidEmail").or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "val.invalidPhone")
      .or(z.literal("")),
    password: z.string().min(8, "val.passwordMinLength"),
    confirm_password: z.string().min(1, "val.passwordRequired"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "val.passwordMismatch",
    path: ["confirm_password"],
  })
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "val.emailOrPhoneRequired",
    path: ["email"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState("");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError("");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const body: Record<string, string> = {
        full_name: values.full_name,
        password: values.password,
      };
      if (values.email) body.email = values.email;
      if (values.phone) body.phone = values.phone;

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.detail?.[0]?.msg ||
          data?.detail ||
          "Registration failed. Please try again.";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      router.push("/login");
    } catch (err: unknown) {
      setError(
        (err as Error).message || "An error occurred during registration.",
      );
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-sm border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">
          {t("auth.registerTitle")}
        </CardTitle>
        <CardDescription>
          {t("auth.registerSubtitle")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">{t("auth.fullNameLabel")}</Label>
            <Input
              id="full_name"
              placeholder={t("auth.fullNamePlaceholder")}
              {...form.register("full_name")}
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive font-semibold">
                {t(form.formState.errors.full_name.message as any)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive font-semibold">
                {t(form.formState.errors.email.message as any)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("auth.phoneLabel")}</Label>
            <Input
              id="phone"
              placeholder={t("auth.phonePlaceholder")}
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive font-semibold">
                {t(form.formState.errors.phone.message as any)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive font-semibold">
                {t(form.formState.errors.password.message as any)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">{t("auth.confirmPasswordLabel")}</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder={t("auth.confirmPasswordPlaceholder")}
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password && (
              <p className="text-sm text-destructive font-semibold">
                {t(form.formState.errors.confirm_password.message as any)}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.registering") : t("auth.registerButton")}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t("auth.hasAccount")}{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline ml-1"
            >
              {t("auth.loginLink")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

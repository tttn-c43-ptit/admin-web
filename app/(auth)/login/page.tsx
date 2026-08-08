"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setAccessToken, setRefreshToken } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "@/components/i18n-provider";

const loginSchema = z.object({
  identifier: z.string().min(1, "val.usernameRequired"),
  password: z.string().min(1, "val.passwordRequired"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError("");

    try {
      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error("Incorrect username or password.");
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);

      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred during login.");
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-sm border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">{t("auth.loginTitle")}</CardTitle>
        <CardDescription>
          {t("auth.loginSubtitle")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-destructive font-semibold">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="username">{t("auth.usernameLabel")}</Label>
            <Input id="username" placeholder={t("auth.usernamePlaceholder")} {...form.register("identifier")} />
            {form.formState.errors.identifier && (
              <p className="text-sm font-semibold text-destructive">
                {t(form.formState.errors.identifier.message as any)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <Input id="password" type="password" placeholder={t("auth.passwordPlaceholder")} {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm font-semibold text-destructive">
                {t(form.formState.errors.password.message as any)}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t("auth.noAccount")}{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline ml-1"
            >
              {t("auth.registerLink")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

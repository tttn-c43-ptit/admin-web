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

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your username"),
  password: z.string().min(1, "Please enter your password"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
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
      
      // Call backend
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
    <Card className="w-full max-w-sm border-border">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">Login</CardTitle>
        <CardDescription>
          Agricultural Plant Management System
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-destructive font-semibold">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="Enter username..." {...form.register("identifier")} />
            {form.formState.errors.identifier && (
              <p className="text-sm font-semibold text-destructive">{form.formState.errors.identifier.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm font-semibold text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Login"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

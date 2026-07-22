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

const registerSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address").or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "Invalid phone number (8–15 digits)")
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "Please provide either an email or phone number",
    path: ["email"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
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
    <Card className="w-full max-w-sm border-border">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">
          Register
        </CardTitle>
        <CardDescription>
          Create an owner account to get started
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
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              placeholder="Enter your full name..."
              {...form.register("full_name")}
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Re-enter your password"
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirm_password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Register"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

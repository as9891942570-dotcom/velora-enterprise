"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiRequestError } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

export default function AdminLoginContent() {
  const { login, isAdmin, isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isAdmin) {
      router.replace(redirect);
    }
  }, [isLoading, isAuthenticated, isAdmin, redirect, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-heading text-2xl font-semibold text-foreground">
            Velora Enterprise
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Admin sign in</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          autoComplete="off"
        >
          <div>
            <label htmlFor="velora-admin-email" className="mb-1.5 block text-sm font-medium">
              Admin email
            </label>
            <input
              id="velora-admin-email"
              name="velora-admin-email"
              type="email"
              required
              autoComplete="off"
              readOnly
              onFocus={(e) => e.target.removeAttribute("readonly")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="velora-admin-password" className="block text-sm font-medium">
                Password
              </label>
              <Link
                href="/admin/forgot-password"
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <PasswordInput
              id="velora-admin-password"
              name="velora-admin-password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in to Admin"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Customer?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Store login
          </Link>
        </p>
      </div>
    </div>
  );
}

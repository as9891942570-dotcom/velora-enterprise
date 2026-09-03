"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { MessageResponse } from "@/lib/types";

function AdminResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset link");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset link");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch<MessageResponse>("/auth/admin/reset-password", {
        method: "POST",
        body: { token, password, confirm_password: confirmPassword },
      });
      setSuccess(res.message);
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-heading text-2xl font-semibold text-foreground">
            Velora Enterprise
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Set a new admin password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="admin-new-password" className="mb-1.5 block text-sm font-medium">
              New Password
            </label>
            <PasswordInput
              id="admin-new-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="admin-confirm-password" className="mb-1.5 block text-sm font-medium">
              Confirm Password
            </label>
            <PasswordInput
              id="admin-confirm-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-700 dark:text-green-300">{success}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading || !token}>
            {loading ? "Resetting Password..." : "Save New Password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/admin/login" className="font-medium text-foreground hover:underline">
            Back to admin sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminResetPasswordForm />
    </Suspense>
  );
}

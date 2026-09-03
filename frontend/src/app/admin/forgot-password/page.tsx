"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { MessageResponse } from "@/lib/types";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your admin email address");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch<MessageResponse>("/auth/admin/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSuccess(res.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to send reset link");
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
          <p className="mt-2 text-sm text-muted-foreground">Admin password reset</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="admin-forgot-email" className="mb-1.5 block text-sm font-medium">
              Admin email
            </label>
            <input
              id="admin-forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-700 dark:text-green-300">{success}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
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

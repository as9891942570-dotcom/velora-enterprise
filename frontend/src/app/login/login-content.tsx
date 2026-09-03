"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiRequestError } from "@/lib/api";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { useAuth } from "@/lib/auth-context";

export default function LoginPageContent() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirect = getSafeRedirect(redirectParam, "/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (redirectParam?.startsWith("/admin")) {
      const adminRedirect =
        redirectParam === "/admin" ? "" : `?redirect=${encodeURIComponent(redirectParam)}`;
      router.replace(`/admin/login${adminRedirect}`);
    }
  }, [redirectParam, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(getSafeRedirect(redirectParam, "/"));
  }, [isLoading, isAuthenticated, redirectParam, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push(getSafeRedirect(redirectParam, "/"));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const registerHref =
    redirect !== "/"
      ? `/register?redirect=${encodeURIComponent(redirect)}`
      : "/register";

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="font-heading text-center text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Sign in to your Velora account
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" autoComplete="off">
        <div>
          <label htmlFor="velora-customer-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="velora-customer-email"
            name="velora-customer-email"
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
            <label htmlFor="velora-customer-password" className="block text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <PasswordInput
            id="velora-customer-password"
            name="velora-customer-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-medium text-foreground hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

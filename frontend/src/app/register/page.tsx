"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ApiRequestError } from "@/lib/api";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { useAuth } from "@/lib/auth-context";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password);
      router.push(getSafeRedirect(redirectParam, "/"));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const loginHref =
    redirectParam && getSafeRedirect(redirectParam) !== "/"
      ? `/login?redirect=${encodeURIComponent(getSafeRedirect(redirectParam))}`
      : "/login";

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="font-heading text-center text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Join Velora Enterprise</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" autoComplete="off">
        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium">
            Full Name
          </label>
          <input
            id="register-name"
            name="register-name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="register-email"
            name="register-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="register-password"
            name="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RegisterForm />
    </Suspense>
  );
}

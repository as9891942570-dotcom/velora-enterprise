"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiRequestError } from "@/lib/api";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { useAuth } from "@/lib/auth-context";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;

          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

export default function LoginPageContent() {
  const { login, googleLogin, isAuthenticated, isLoading } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const redirectParam = searchParams.get("redirect");
  const redirect = getSafeRedirect(redirectParam, "/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /*
   * Redirect admin login attempts
   */
  useEffect(() => {
    if (redirectParam?.startsWith("/admin")) {
      const adminRedirect =
        redirectParam === "/admin"
          ? ""
          : `?redirect=${encodeURIComponent(redirectParam)}`;

      router.replace(`/admin/login${adminRedirect}`);
    }
  }, [redirectParam, router]);

  /*
   * Redirect already authenticated customer
   */
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    router.replace(getSafeRedirect(redirectParam, "/"));
  }, [isLoading, isAuthenticated, redirectParam, router]);

  /*
   * Google Sign-In button
   *
   * Google Identity Services script can load before OR after
   * this React component mounts. Therefore we check immediately
   * and also poll briefly until window.google becomes available.
   */
  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    const renderGoogleButton = () => {
      if (cancelled) {
        return;
      }

      if (!googleButtonRef.current) {
        return;
      }

      if (!window.google) {
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.error(
          "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.",
        );
        return;
      }

      const container = googleButtonRef.current;

      /*
       * Prevent duplicate Google buttons
       */
      container.innerHTML = "";

      /*
       * Initialize Google Identity Services
       */
      window.google.accounts.id.initialize({
        client_id: clientId,

        callback: async (response) => {
          if (!response.credential) {
            setError("Google sign-in failed. No credential received.");
            return;
          }

          setGoogleLoading(true);
          setError("");

          try {
            await googleLogin(response.credential);

            router.push(
              getSafeRedirect(redirectParam, "/"),
            );
          } catch (err) {
            setError(
              err instanceof ApiRequestError
                ? err.detail
                : "Google sign-in failed",
            );
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      /*
       * Render Google button
       */
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 400,
      });

      /*
       * Google button rendered successfully
       */
      console.log("Google Sign-In button rendered.");
    };

    /*
     * Google may already be loaded
     */
    if (window.google) {
      renderGoogleButton();
    } else {
      /*
       * Wait for Google Identity Services to load
       */
      interval = window.setInterval(() => {
        if (window.google) {
          if (interval !== undefined) {
            window.clearInterval(interval);
          }

          renderGoogleButton();
        }
      }, 100);
    }

    return () => {
      cancelled = true;

      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [googleLogin, redirectParam, router]);

  /*
   * Normal email/password login
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(email, password);

      router.push(
        getSafeRedirect(redirectParam, "/"),
      );
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.detail
          : "Login failed",
      );
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
    <>
      {/* Google Identity Services */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        {/* Heading */}

        <h1 className="font-heading text-center text-3xl font-semibold">
          Welcome back
        </h1>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to your Velora account
        </p>

        {/* Email / Password Login */}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
          autoComplete="off"
        >
          {/* Email */}

          <div>
            <label
              htmlFor="velora-customer-email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email
            </label>

            <input
              id="velora-customer-email"
              name="velora-customer-email"
              type="email"
              required
              autoComplete="off"
              readOnly
              onFocus={(e) =>
                e.target.removeAttribute("readonly")
              }
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className={inputClass}
            />
          </div>

          {/* Password */}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="velora-customer-password"
                className="block text-sm font-medium"
              >
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
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          {/* Error */}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Sign In */}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || googleLoading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </Button>
        </form>

        {/* OR */}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />

          <span className="text-xs text-muted-foreground">
            OR
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Google Sign-In */}

        <div className="flex justify-center">
          <div
            ref={googleButtonRef}
            className="min-h-[40px]"
          />
        </div>

        {/* Google Loading */}

        {googleLoading && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Signing in with Google...
          </p>
        )}

        {/* Register */}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}

          <Link
            href={registerHref}
            className="font-medium text-foreground hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </>
  );
}
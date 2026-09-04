"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { subscribeCart } from "@/lib/api";
import { loadCartShared } from "@/lib/cart-api";
import { getGuestCartCount } from "@/lib/cart-storage";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [cartCount, setCartCount] = useState(() => getGuestCartCount());
  const [mobileOpen, setMobileOpen] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isLoading) {
      // Keep last known / guest count while auth hydrates (no API yet).
      return;
    }

    let cancelled = false;

    async function loadCart() {
      const requestId = ++requestIdRef.current;
      try {
        const cart = await loadCartShared(isAuthenticated);
        if (cancelled || requestId !== requestIdRef.current) return;
        setCartCount(cart?.item_count ?? (isAuthenticated ? 0 : getGuestCartCount()));
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return;
        setCartCount(isAuthenticated ? 0 : getGuestCartCount());
      }
    }

    loadCart();
    const unsubscribe = subscribeCart(() => {
      if (!cancelled) loadCart();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthenticated, isLoading]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-wide text-foreground"
        >
          Velora Enterprise
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <ButtonLink href="/orders" variant="ghost" size="sm" className="gap-1.5">
                    <User className="size-4" />
                    Account
                  </ButtonLink>
                  <Button variant="ghost" size="sm" onClick={() => logout()}>
                    Logout
                  </Button>
                </div>
              ) : (
                <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Login
                </ButtonLink>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border md:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cart
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

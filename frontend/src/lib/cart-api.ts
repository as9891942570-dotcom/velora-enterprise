/**
 * Shared cart loading with in-flight deduplication.
 * Prefer sync result; only GET /cart when sync did not return a cart.
 */
import { apiFetch } from "@/lib/api";
import { syncGuestCartToServer } from "@/lib/cart-sync";
import type { Cart } from "@/lib/types";

const inflight = new Map<string, Promise<Cart | null>>();

export async function loadCartShared(isAuthenticated: boolean): Promise<Cart | null> {
  const key = isAuthenticated ? "customer" : "guest";
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const synced = await syncGuestCartToServer(isAuthenticated);
      if (synced) return synced;
      return await apiFetch<Cart>("/cart", {
        auth: isAuthenticated,
        authScope: "customer",
      });
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

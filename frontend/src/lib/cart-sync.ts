import { apiFetch } from "@/lib/api";
import {
  clearGuestCart,
  getGuestCart,
  type GuestCartItem,
} from "@/lib/cart-storage";
import type { Cart } from "@/lib/types";

/**
 * Sync guest localStorage items to the server cart.
 * - With guest items: POST /cart/sync and return that cart.
 * - With no guest items: return null (caller may GET /cart once).
 *   Avoids an extra GET here that duplicates Header/cart page fetches.
 */
export async function syncGuestCartToServer(isAuthenticated = false): Promise<Cart | null> {
  const items: GuestCartItem[] = getGuestCart();
  if (items.length === 0) {
    return null;
  }

  try {
    const cart = await apiFetch<Cart>("/cart/sync", {
      method: "POST",
      body: { items },
      auth: isAuthenticated,
      authScope: "customer",
    });
    if (isAuthenticated) {
      clearGuestCart();
    }
    return cart;
  } catch {
    return null;
  }
}

export async function mergeGuestCartAfterAuth(): Promise<Cart | null> {
  const cart = await syncGuestCartToServer(true);
  clearGuestCart();
  return cart;
}

import { apiFetch } from "@/lib/api";
import {
  clearGuestCart,
  getGuestCart,
  type GuestCartItem,
} from "@/lib/cart-storage";
import type { Cart } from "@/lib/types";

export async function syncGuestCartToServer(isAuthenticated = false): Promise<Cart | null> {
  const items: GuestCartItem[] = getGuestCart();
  if (items.length === 0) {
    try {
      return await apiFetch<Cart>("/cart", { auth: isAuthenticated });
    } catch {
      return null;
    }
  }

  try {
    const cart = await apiFetch<Cart>("/cart/sync", {
      method: "POST",
      body: { items },
      auth: isAuthenticated,
    });
    if (isAuthenticated) {
      clearGuestCart();
    }
    return cart;
  } catch {
    return null;
  }
}

export async function mergeGuestCartAfterAuth(): Promise<void> {
  await syncGuestCartToServer(true);
  clearGuestCart();
}

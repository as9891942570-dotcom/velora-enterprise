const GUEST_CART_KEY = "velora_guest_cart";

export interface GuestCartItem {
  product_id: string;
  quantity: number;
}

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setGuestCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;
  if (items.length === 0) {
    localStorage.removeItem(GUEST_CART_KEY);
    return;
  }
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function addGuestCartItem(productId: string, quantity: number): void {
  const items = getGuestCart();
  const existing = items.find((item) => item.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ product_id: productId, quantity });
  }
  setGuestCart(items);
}

export function updateGuestCartItem(productId: string, quantity: number): void {
  const items = getGuestCart().filter((item) => item.product_id !== productId);
  if (quantity > 0) {
    items.push({ product_id: productId, quantity });
  }
  setGuestCart(items);
}

export function removeGuestCartItem(productId: string): void {
  setGuestCart(getGuestCart().filter((item) => item.product_id !== productId));
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CART_KEY);
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, item) => sum + item.quantity, 0);
}

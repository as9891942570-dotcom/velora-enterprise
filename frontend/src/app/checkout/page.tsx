"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AddressForm, emptyAddressForm } from "@/components/checkout/address-form";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch, notifyCartChanged } from "@/lib/api";
import { syncGuestCartToServer } from "@/lib/cart-sync";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/format";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import type {
  Address,
  AddressCreateInput,
  CheckoutRequest,
  CheckoutValidation,
  OrderCreateResponse,
  PaymentMethod,
  PaymentVerifyRequest,
} from "@/lib/types";

type CheckoutStep = "details" | "payment";

function isOnlinePayment(method: PaymentMethod): boolean {
  return method !== "cod";
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<CheckoutStep>("details");
  const [validation, setValidation] = useState<CheckoutValidation | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressCreateInput>(emptyAddressForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    payment_method: "cod" as PaymentMethod,
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?redirect=/checkout");
      return;
    }

    async function load() {
      await syncGuestCartToServer(true);
      try {
        const [val, addrList] = await Promise.all([
          apiFetch<CheckoutValidation>("/checkout/validate", { method: "POST", auth: true }),
          apiFetch<Address[]>("/addresses", { auth: true }),
        ]);
        setValidation(val);
        setAddresses(addrList);
        const defaultAddr = addrList.find((a) => a.is_default) ?? addrList[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setForm((f) => ({
            ...f,
            customer_name: defaultAddr.full_name,
            customer_phone: defaultAddr.phone,
          }));
        } else {
          setShowNewAddress(true);
        }
      } catch {
        setValidation(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || user.name,
        customer_email: user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    if (addr) {
      setForm((f) => ({
        ...f,
        customer_name: addr.full_name,
        customer_phone: addr.phone,
      }));
    }
  }, [selectedAddressId, addresses]);

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveNewAddress(): Promise<string | null> {
    const created = await apiFetch<Address>("/addresses", {
      method: "POST",
      body: newAddress,
      auth: true,
    });
    setAddresses((prev) => [...prev, created]);
    setSelectedAddressId(created.id);
    setShowNewAddress(false);
    setNewAddress(emptyAddressForm());
    return created.id;
  }

  async function resolveAddressId(): Promise<string | null> {
    if (showNewAddress || !selectedAddressId) {
      return saveNewAddress();
    }
    return selectedAddressId;
  }

  async function handleContinueToPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await resolveAddressId();
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please complete your delivery address");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (isOnlinePayment(form.payment_method) && !onlineAvailable) {
      setError("Online payment is currently being configured. Please choose Cash on Delivery.");
      setSubmitting(false);
      return;
    }

    try {
      const addressId = await resolveAddressId();

      const payload: CheckoutRequest = {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        address_id: addressId,
        payment_method: form.payment_method,
        notes: form.notes || null,
      };

      const order = await apiFetch<OrderCreateResponse>("/checkout/orders", {
        method: "POST",
        body: payload,
        auth: true,
      });
      notifyCartChanged();

      if (order.razorpay && isOnlinePayment(form.payment_method)) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError("Failed to load payment gateway. Please try again.");
          setSubmitting(false);
          return;
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || order.razorpay.key_id;

        openRazorpayCheckout({
          key: keyId,
          amount: order.razorpay.amount,
          currency: order.razorpay.currency,
          name: "Velora Enterprise",
          description: `Order ${order.order_number}`,
          order_id: order.razorpay.razorpay_order_id,
          prefill: {
            name: form.customer_name,
            email: form.customer_email,
            contact: form.customer_phone,
          },
          theme: { color: "#524a42" },
          handler: async (response) => {
            try {
              const verifyPayload: PaymentVerifyRequest = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };
              await apiFetch("/checkout/verify-payment", {
                method: "POST",
                body: verifyPayload,
                auth: true,
              });
              router.push(`/orders/${order.order_number}/confirmation`);
            } catch {
              setError("Payment verification failed. Contact support if amount was deducted.");
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setError("Payment cancelled. Your order is saved as pending payment.");
              setSubmitting(false);
            },
          },
        });
      } else {
        router.push(`/orders/${order.order_number}/confirmation`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <LoadingSpinner />;

  if (!validation?.valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold">Cannot checkout</h1>
        <ul className="mt-4 space-y-1 text-sm text-destructive">
          {validation?.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
        <ButtonLink href="/cart" className="mt-6">
          Back to Cart
        </ButtonLink>
      </div>
    );
  }

  const onlineAvailable = validation.online_payment_available === true;
  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-foreground">Checkout</h1>

      <div className="mt-6 flex gap-2 text-sm">
        <StepIndicator label="Contact & Address" active={step === "details"} done={step === "payment"} />
        <span className="text-muted-foreground">→</span>
        <StepIndicator label="Payment" active={step === "payment"} done={false} />
      </div>

      <form
        onSubmit={step === "details" ? handleContinueToPayment : handlePlaceOrder}
        className="mt-8 grid gap-10 lg:grid-cols-3"
      >
        <div className="space-y-8 lg:col-span-2">
          {step === "details" && (
            <>
              <section>
                <h2 className="font-heading text-lg font-semibold">Contact Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                    <input
                      required
                      value={form.customer_name}
                      onChange={(e) => updateField("customer_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      required
                      readOnly
                      value={form.customer_email}
                      className="h-9 w-full rounded-lg border border-input bg-muted px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      value={form.customer_phone}
                      onChange={(e) => updateField("customer_phone", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">Delivery Address</h2>
                  <button
                    type="button"
                    onClick={() => setShowNewAddress(!showNewAddress)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {showNewAddress ? "Use saved address" : "Add new address"}
                  </button>
                </div>

                {!showNewAddress && addresses.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className="flex cursor-pointer gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 size-4 accent-primary"
                        />
                        <div className="text-sm">
                          <p className="font-medium">
                            {addr.full_name}
                            {addr.is_default && (
                              <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">Default</span>
                            )}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                            <br />
                            {addr.city}, {addr.state} {addr.pincode}
                            <br />
                            {addr.phone}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {(showNewAddress || addresses.length === 0) && (
                  <div className="mt-4">
                    <AddressForm value={newAddress} onChange={setNewAddress} />
                  </div>
                )}
              </section>
            </>
          )}

          {step === "payment" && (
            <>
              <section>
                <h2 className="font-heading text-lg font-semibold">Payment Method</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose how you would like to pay for your order.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={form.payment_method === "cod"}
                      onChange={() => updateField("payment_method", "cod")}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium">Cash on Delivery</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pay with cash when your order is delivered.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${
                      onlineAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={form.payment_method === "online"}
                      onChange={() => onlineAvailable && updateField("payment_method", "online")}
                      disabled={!onlineAvailable}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium">Online Payment</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pay securely via Razorpay. Supports UPI, Credit Card, Debit Card, and Net Banking.
                      </p>
                      {!onlineAvailable && (
                        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Online payment is currently being configured. Please choose Cash on Delivery.
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              </section>

              <section>
                <label className="mb-1.5 block text-sm font-medium">Order Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </section>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-heading text-lg font-semibold">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({validation.item_count} items)</span>
              <span>{formatINR(validation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {parseFloat(validation.shipping_amount) === 0
                  ? "Free"
                  : formatINR(validation.shipping_amount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span>{formatINR(validation.total_amount)}</span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {step === "details" ? (
            <Button type="submit" className="mt-6 w-full" size="lg" disabled={submitting}>
              {submitting ? "Saving..." : "Continue to Payment"}
            </Button>
          ) : (
            <>
              <Button type="submit" className="mt-6 w-full" size="lg" disabled={submitting}>
                {submitting
                  ? "Processing..."
                  : form.payment_method === "cod"
                    ? "Place Order"
                    : "Pay Securely"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  setStep("details");
                  setError("");
                }}
              >
                Back to Address
              </Button>
            </>
          )}

          <ButtonLink href="/cart" variant="outline" className="mt-3 w-full">
            Back to Cart
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

function StepIndicator({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={
        active || done
          ? "font-medium text-foreground"
          : "text-muted-foreground"
      }
    >
      {label}
    </span>
  );
}

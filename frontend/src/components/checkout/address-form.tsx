"use client";

import { INDIAN_STATES } from "@/lib/razorpay";
import type { AddressCreateInput, AddressType } from "@/lib/types";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface AddressFormProps {
  value: AddressCreateInput;
  onChange: (value: AddressCreateInput) => void;
  showDefault?: boolean;
}

export function AddressForm({ value, onChange, showDefault = true }: AddressFormProps) {
  function update(field: keyof AddressCreateInput, fieldValue: string | boolean) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium">Full Name</label>
        <input
          required
          value={value.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Phone</label>
        <input
          type="tel"
          required
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          placeholder="10-digit mobile"
          value={value.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Address Type</label>
        <select
          value={value.address_type ?? "home"}
          onChange={(e) => update("address_type", e.target.value as AddressType)}
          className={inputClass}
        >
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium">Address Line 1</label>
        <input
          required
          value={value.line1}
          onChange={(e) => update("line1", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium">Address Line 2 (optional)</label>
        <input
          value={value.line2 ?? ""}
          onChange={(e) => update("line2", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium">Landmark (optional)</label>
        <input
          value={value.landmark ?? ""}
          onChange={(e) => update("landmark", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">City</label>
        <input
          required
          value={value.city}
          onChange={(e) => update("city", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">State</label>
        <select
          required
          value={value.state}
          onChange={(e) => update("state", e.target.value)}
          className={inputClass}
        >
          <option value="">Select state</option>
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Pincode</label>
        <input
          required
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          value={value.pincode}
          onChange={(e) => update("pincode", e.target.value)}
          className={inputClass}
        />
      </div>
      {showDefault && (
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.is_default ?? false}
              onChange={(e) => update("is_default", e.target.checked)}
              className="size-4 accent-primary"
            />
            Set as default address
          </label>
        </div>
      )}
    </div>
  );
}

export const emptyAddressForm = (): AddressCreateInput => ({
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "IN",
  address_type: "home",
  is_default: false,
});

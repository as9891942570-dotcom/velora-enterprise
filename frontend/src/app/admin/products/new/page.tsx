"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/layout/back-link";
import { ProductImageField } from "@/components/admin/product-image-field";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { uploadProductImage } from "@/lib/upload";import type { Category, PaginatedResponse, Product, ProductCreateInput } from "@/lib/types";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    short_description: "",
    price: "",
    compare_at_price: "",
    stock_quantity: "0",
    category_id: "",
    is_active: true,
    is_featured: false,
    material: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  useEffect(() => {
    apiFetch<PaginatedResponse<Category>>(`/categories?page_size=100`)
      .then((data) => setCategories(data.items))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      let imageUrl = "";
      if (imageFile) {
        const uploaded = await uploadProductImage(imageFile);
        imageUrl = uploaded.url;
      }

      const payload: ProductCreateInput = {
        name: form.name,
        description: form.description || null,
        short_description: form.short_description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        stock_quantity: parseInt(form.stock_quantity, 10),
        category_id: form.category_id,
        is_active: form.is_active,
        is_featured: form.is_featured,
        material: form.material || null,
        images: imageUrl
          ? [{ url: imageUrl, alt_text: form.name, sort_order: 0 }]
          : [],
      };      await apiFetch<Product>("/admin/products", {
        method: "POST",
        body: payload,
        auth: true,
      });
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to create product");
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/products">Back to Products</BackLink>
      <h1 className="font-heading mt-4 text-2xl font-semibold">New Product</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Short Description</label>
          <input value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Price (INR)</label>
            <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => updateField("price", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Compare at Price</label>
            <input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(e) => updateField("compare_at_price", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Stock Quantity</label>
            <input required type="number" min="0" value={form.stock_quantity} onChange={(e) => updateField("stock_quantity", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select required value={form.category_id} onChange={(e) => updateField("category_id", e.target.value)} className={inputClass}>
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Material</label>
          <input value={form.material} onChange={(e) => updateField("material", e.target.value)} className={inputClass} />
        </div>
        <ProductImageField onFileChange={setImageFile} />        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} className="size-4 accent-primary" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => updateField("is_featured", e.target.checked)} className="size-4 accent-primary" />
            Featured
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Product"}
          </Button>
          <Button render={<Link href="/admin/products" />} variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

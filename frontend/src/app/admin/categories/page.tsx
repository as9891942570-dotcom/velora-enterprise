"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { Category, CategoryCreateInput, PaginatedResponse } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    image_url: "",
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await apiFetch<PaginatedResponse<Category>>(
        "/admin/categories?page_size=100",
        { auth: true },
      );
      setCategories(data.items);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: "", description: "", image_url: "", is_active: true });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(category: Category) {
    setForm({
      name: category.name,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      is_active: category.is_active,
    });
    setEditingId(category.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload: CategoryCreateInput = {
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await apiFetch(`/admin/categories/${editingId}`, {
          method: "PATCH",
          body: payload,
          auth: true,
        });
      } else {
        await apiFetch("/admin/categories", {
          method: "POST",
          body: payload,
          auth: true,
        });
      }
      resetForm();
      loadCategories();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "DELETE", auth: true });
      loadCategories();
    } catch {
      alert("Failed to delete category");
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} categories</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add Category
          </Button>
        )}
      </div>

      {showForm && (
        <>
          <button
            type="button"
            onClick={resetForm}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Categories
          </button>
          <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">
              {editingId ? "Edit Category" : "New Category"}
            </h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Image URL</label>
            <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 accent-primary" />
            Active
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId ? "Update" : "Create"}
          </Button>
        </form>
        </>
      )}

      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">{category.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={category.is_active ? "text-xs text-green-700" : "text-xs text-muted-foreground"}>
                {category.is_active ? "Active" : "Inactive"}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(category)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(category.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

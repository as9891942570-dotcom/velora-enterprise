"use client";

import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { apiFetch, buildQuery, notifyAdminNotificationsChanged } from "@/lib/api";
import { formatDateShort } from "@/lib/format";
import type { ContactMessage, PaginatedResponse } from "@/lib/types";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiFetch<PaginatedResponse<ContactMessage>>(
      `/admin/messages${buildQuery({ page_size: 50 })}`,
      { auth: true },
    )
      .then((data) => setMessages(data.items))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  async function openMessage(id: string) {
    try {
      const message = await apiFetch<ContactMessage>(`/admin/messages/${id}`, { auth: true });
      setSelected(message);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: message.status } : m)),
      );
      notifyAdminNotificationsChanged();
    } catch {
      // ignore
    }
  }

  async function updateStatus(status: ContactMessage["status"]) {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await apiFetch<ContactMessage>(
        `/admin/messages/${selected.id}/status`,
        { method: "PATCH", body: { status }, auth: true },
      );
      setSelected(updated);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      notifyAdminNotificationsChanged();
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Contact Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Customer inquiries from the contact form</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {messages.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No messages yet</p>
          ) : (
            messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => openMessage(message.id)}
                className={`w-full p-4 text-left hover:bg-muted/50 ${
                  selected?.id === message.id ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{message.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {message.name} · {message.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      message.status === "unread"
                        ? "bg-primary/10 text-primary"
                        : message.status === "resolved"
                          ? "bg-muted text-muted-foreground"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateShort(message.created_at)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a message to view details</p>
          ) : (
            <>
              <h2 className="font-heading text-lg font-semibold">{selected.subject}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                From {selected.name} ({selected.email}) · {formatDateShort(selected.created_at)}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.status !== "read" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updating}
                    onClick={() => updateStatus("read")}
                  >
                    Mark Read
                  </Button>
                )}
                {selected.status !== "resolved" && (
                  <Button size="sm" disabled={updating} onClick={() => updateStatus("resolved")}>
                    Mark Resolved
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

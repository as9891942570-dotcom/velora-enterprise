import { getAccessToken, refreshAccessToken } from "@/lib/api";
import { waitForAuthReady } from "@/lib/auth-gate";
import { API_BASE_URL } from "@/lib/config";
import type { AuthScope } from "@/lib/auth-session";

export interface UploadResult {
  url: string;
}

/** Upload a product image file to the backend. Returns a server-relative URL like /uploads/products/.... */
export async function uploadProductImage(
  file: File,
  scope: AuthScope = "admin",
): Promise<UploadResult> {
  await waitForAuthReady(scope);
  let token = getAccessToken(scope);
  if (!token) {
    token = await refreshAccessToken(scope);
  }
  if (!token) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/admin/upload/file`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let detail = "Image upload failed";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json() as Promise<UploadResult>;
}

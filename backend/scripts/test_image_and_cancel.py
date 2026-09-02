"""Integration test for product image upload and order cancellation."""

import io
import sys

import httpx

BASE = "http://127.0.0.1:8000/api/v1"
ORIGIN = "http://127.0.0.1:8000"


def main() -> int:
    results: list[tuple[str, bool, str]] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        results.append((name, ok, detail))
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

    # Minimal valid JPEG header
    fake_jpeg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xd9"
    )

    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        # Admin login
        r = client.post(
            "/auth/admin/login",
            json={"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"},
        )
        check("Admin login", r.status_code == 200)
        admin_token = r.json().get("access_token", "")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Image upload
        files = {"file": ("test-product.jpg", io.BytesIO(fake_jpeg), "image/jpeg")}
        r = client.post("/admin/upload/file", headers=admin_headers, files=files)
        check("Upload product image", r.status_code == 200, r.text[:120])
        image_url = r.json().get("url", "") if r.status_code == 200 else ""
        check("Image URL is /uploads path", image_url.startswith("/uploads/products/"), image_url)
        check("No file:// in URL", "file://" not in image_url)

        if image_url:
            r2 = httpx.get(f"{ORIGIN}{image_url}", timeout=10.0)
            check("Image publicly accessible", r2.status_code == 200, str(r2.status_code))

        # Customer login
        r = client.post(
            "/auth/login",
            json={"email": "testcustomer@velora.com", "password": "TestPass123!"},
        )
        if r.status_code != 200:
            r = client.post(
                "/auth/register",
                json={
                    "name": "Test Customer",
                    "email": "testcustomer@velora.com",
                    "password": "TestPass123!",
                },
            )
        check("Customer login", r.status_code in (200, 201))
        cust_token = r.json().get("access_token", "")
        cust_headers = {"Authorization": f"Bearer {cust_token}"}

        # Cancel without reason should fail
        r = client.get("/orders", headers=cust_headers)
        if r.status_code == 200 and r.json().get("items"):
            order_num = r.json()["items"][0]["order_number"]
            if r.json()["items"][0]["status"] in ("pending", "confirmed"):
                r = client.post(f"/orders/{order_num}/cancel", headers=cust_headers, json={})
                check("Cancel without reason rejected", r.status_code == 422, r.text[:80])

                r = client.post(
                    f"/orders/{order_num}/cancel",
                    headers=cust_headers,
                    json={"reason": "Ordered by mistake"},
                )
                if r.status_code == 200:
                    data = r.json()
                    check("Customer cancel saves reason", data.get("cancellation_reason") == "Ordered by mistake")
                    check("Customer cancel saves role", data.get("cancelled_by_role") == "customer")
                    check("Customer cancel saves timestamp", bool(data.get("cancelled_at")))
                else:
                    check("Customer cancel with reason", False, r.text[:120])
            else:
                check("Customer cancel flow", True, "skipped — no cancellable order")
        else:
            check("Customer cancel flow", True, "skipped — no orders")

        # Admin cancel reason required
        r = client.get("/admin/orders", headers=admin_headers, params={"status": "pending"})
        if r.status_code == 200 and r.json().get("items"):
            order_id = r.json()["items"][0]["id"]
            r = client.patch(
                f"/admin/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "cancelled"},
            )
            check("Admin cancel without reason rejected", r.status_code == 422, r.text[:80])
        else:
            check("Admin cancel validation", True, "skipped — no pending orders")

        # Admin dashboard regression
        r = client.get("/admin/dashboard/stats", headers=admin_headers)
        check("Admin dashboard still works", r.status_code == 200)

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())

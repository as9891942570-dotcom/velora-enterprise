"""Quick manual test for admin order status PATCH."""

import sys

import httpx

BASE = "http://127.0.0.1:8000/api/v1"


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=30) as client:
        login = client.post(
            "/auth/admin/login",
            json={"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"},
        )
        print("login:", login.status_code)
        if login.status_code != 200:
            print(login.text)
            return 1

        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        listing = client.get("/admin/orders", params={"status": "pending", "page_size": 1}, headers=headers)
        items = listing.json().get("items", [])
        if not items:
            listing = client.get("/admin/orders", params={"page_size": 1}, headers=headers)
            items = listing.json().get("items", [])
        if not items:
            print("no orders to test")
            return 0

        order = items[0]
        order_id = order["id"]
        current = order["status"]
        next_status = {
            "pending": "confirmed",
            "confirmed": "processing",
            "processing": "shipped",
            "shipped": "out_for_delivery",
            "out_for_delivery": "delivered",
        }.get(current)

        if not next_status:
            print(f"order already in {current}, skipping forward transition")
            return 0

        patch = client.patch(
            f"/admin/orders/{order_id}/status",
            headers=headers,
            json={"status": next_status, "note": "manual patch test"},
        )
        print("patch:", patch.status_code, next_status)
        if patch.status_code != 200:
            print(patch.text)
            return 1

        data = patch.json()
        print("response status:", data["status"])
        print("updated_at:", data.get("updated_at"))
        print("items count:", len(data.get("items", [])))

        if current == "pending":
            invalid = client.patch(
                f"/admin/orders/{order_id}/status",
                headers=headers,
                json={"status": "shipped"},
            )
            print("invalid transition:", invalid.status_code, "(expected 400)")

        print("OK")
        return 0


if __name__ == "__main__":
    sys.exit(main())

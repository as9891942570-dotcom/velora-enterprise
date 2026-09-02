"""API integration smoke tests for Velora Enterprise."""

import sys

import httpx

BASE = "http://127.0.0.1:8000/api/v1"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        r = client.get("/health")
        data = r.json()
        check("Health endpoint", r.status_code == 200 and data.get("database") == "connected", str(data))

        r = client.get("/config")
        check("Public config", r.status_code == 200 and "shipping_flat_rate" in r.json())

        r = client.get("/products", params={"limit": 5})
        pdata = r.json()
        check("List products", r.status_code == 200 and pdata.get("total", 0) >= 1, f"total={pdata.get('total')}")

        r = client.get("/categories")
        cdata = r.json()
        check("List categories", r.status_code == 200 and cdata.get("total", 0) >= 1, f"total={cdata.get('total')}")

        slug = pdata["items"][0]["slug"]
        r = client.get(f"/products/{slug}")
        check("Get product by slug", r.status_code == 200, slug)

        r = client.post(
            "/auth/admin/login",
            json={"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"},
        )
        check("Admin login", r.status_code == 200, r.text[:100] if r.status_code != 200 else "ok")
        admin_token = r.json().get("access_token", "") if r.status_code == 200 else ""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        r = client.get("/admin/dashboard/stats", headers=admin_headers)
        ddata = r.json()
        dashboard_ok = (
            r.status_code == 200
            and "total_customers" in ddata
            and "pending_orders" in ddata
            and "inventory" in ddata
        )
        check("Admin dashboard KPIs", dashboard_ok, str(ddata)[:120])

        r = client.get("/admin/messages", headers=admin_headers)
        check("Admin messages list", r.status_code == 200, r.text[:80])

        r = client.post(
            "/auth/register",
            json={"name": "Test Customer", "email": "testcustomer@velora.com", "password": "TestPass123!"},
        )
        if r.status_code == 400 and "already" in r.text.lower():
            r = client.post("/auth/login", json={"email": "testcustomer@velora.com", "password": "TestPass123!"})
        check("Customer register/login", r.status_code in (200, 201), r.text[:80])
        cust_token = r.json().get("access_token", "") if r.status_code in (200, 201) else ""
        cust_headers = {"Authorization": f"Bearer {cust_token}"}

        product_id = pdata["items"][0]["id"]
        r = client.post("/cart/items", json={"product_id": product_id, "quantity": 2})
        check("Add to cart (guest)", r.status_code == 200, r.text[:80])

        r = client.get("/cart")
        check("Get cart", r.status_code == 200 and r.json().get("item_count", 0) >= 1)

        r = client.post("/cart/sync", json={"items": [{"product_id": product_id, "quantity": 1}]})
        check("Cart sync", r.status_code == 200, r.text[:80])

        r = client.post("/cart/items", headers=cust_headers, json={"product_id": product_id, "quantity": 2})
        check("Add to cart (customer)", r.status_code == 200, r.text[:80])

        r = client.post("/checkout/validate", headers=cust_headers)
        check("Checkout validate (auth required)", r.status_code == 200, r.text[:100])

        r = client.post("/checkout/validate")
        check("Checkout validate blocked for guest", r.status_code == 401)

        r = client.post(
            "/addresses",
            headers=cust_headers,
            json={
                "full_name": "Test Customer",
                "phone": "9876543210",
                "line1": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
                "country": "IN",
                "address_type": "home",
                "is_default": True,
            },
        )
        check("Create address", r.status_code in (200, 201), r.text[:100])
        address_id = r.json().get("id", "") if r.status_code in (200, 201) else ""

        r = client.post(
            "/checkout/orders",
            headers=cust_headers,
            json={
                "customer_name": "Test Customer",
                "customer_email": "testcustomer@velora.com",
                "customer_phone": "9876543210",
                "payment_method": "cod",
                "address_id": address_id,
            },
        )
        check("COD checkout", r.status_code in (200, 201), r.text[:120])
        order_num = r.json().get("order_number", "") if r.status_code in (200, 201) else ""
        order_status = r.json().get("status", "") if r.status_code in (200, 201) else ""
        order_payment = r.json().get("payment_status", "") if r.status_code in (200, 201) else ""
        check("COD order status is pending", order_status == "pending", order_status)
        check("COD payment status is pending", order_payment == "pending", order_payment)

        if order_num:
            r = client.get(f"/orders/{order_num}", headers=cust_headers)
            check("Get order by number", r.status_code == 200, order_num)
            check(
                "Order detail status pending",
                r.status_code == 200 and r.json().get("status") == "pending",
                r.json().get("status", "") if r.status_code == 200 else "",
            )

        r = client.get("/admin/dashboard/stats", headers=cust_headers)
        check("RBAC - customer blocked from admin", r.status_code == 403)

        r = client.post(
            "/contact",
            json={"name": "Test", "email": "test@test.com", "subject": "Hi", "message": "Hello from smoke test"},
        )
        check("Contact form", r.status_code == 200)

        r = client.get("/admin/messages", headers=admin_headers)
        msgs = r.json()
        check(
            "Contact message stored",
            r.status_code == 200 and msgs.get("total", 0) >= 1,
            f"total={msgs.get('total')}",
        )

    print("\n=== SUMMARY ===")
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"{passed}/{len(results)} passed")
    for name, ok, detail in results:
        if not ok:
            print(f"  FAILED: {name} — {detail}")

    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())

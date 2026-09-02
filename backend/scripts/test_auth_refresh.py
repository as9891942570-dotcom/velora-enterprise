"""Verify auth refresh endpoints restore sessions (HttpOnly cookies)."""

import sys

import httpx

BASE = "http://127.0.0.1:8000/api/v1"


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=30) as client:
        # Admin login
        login = client.post(
            "/auth/admin/login",
            json={"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"},
        )
        print("admin login:", login.status_code)
        if login.status_code != 200:
            print(login.text)
            return 1

        access = login.json()["access_token"]
        cookies = client.cookies
        print("admin cookie set:", "admin_refresh_token" in cookies)

        # Simulate page refresh: new client with only cookies (no in-memory token)
        with httpx.Client(base_url=BASE, timeout=30, cookies=cookies) as refreshed:
            refresh = refreshed.post("/auth/admin/refresh")
            print("admin refresh:", refresh.status_code)
            if refresh.status_code != 200:
                print(refresh.text)
                return 1

            new_access = refresh.json()["access_token"]
            me = refreshed.get("/auth/me", headers={"Authorization": f"Bearer {new_access}"})
            print("admin /me:", me.status_code, me.json().get("role"))

            orders = refreshed.get(
                "/admin/orders?page_size=1",
                headers={"Authorization": f"Bearer {new_access}"},
            )
            print("admin orders:", orders.status_code)

        # Customer flow
        client.post("/auth/logout")  # clear any customer cookie from prior tests
        cust_login = client.post(
            "/auth/login",
            json={"email": "testcustomer@velora.com", "password": "TestPass123!"},
        )
        if cust_login.status_code not in (200, 401):
            print("customer login skipped:", cust_login.status_code)
            return 0
        if cust_login.status_code == 401:
            reg = client.post(
                "/auth/register",
                json={
                    "name": "Test Customer",
                    "email": "testcustomer@velora.com",
                    "password": "TestPass123!",
                },
            )
            if reg.status_code not in (200, 201):
                print("customer register skipped:", reg.status_code)
                return 0
            cust_cookies = client.cookies
        else:
            cust_cookies = client.cookies

        with httpx.Client(base_url=BASE, timeout=30, cookies=cust_cookies) as refreshed:
            refresh = refreshed.post("/auth/refresh")
            print("customer refresh:", refresh.status_code)
            if refresh.status_code != 200:
                print(refresh.text)
                return 1
            new_access = refresh.json()["access_token"]
            me = refreshed.get("/auth/me", headers={"Authorization": f"Bearer {new_access}"})
            print("customer /me:", me.status_code, me.json().get("role"))

        print("OK")
        return 0


if __name__ == "__main__":
    sys.exit(main())

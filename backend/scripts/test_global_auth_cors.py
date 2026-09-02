"""Global auth + CORS verification for customer and admin APIs."""

import sys

import httpx

API = "http://127.0.0.1:8000/api/v1"
ORIGIN = "http://localhost:3000"
H = {"Origin": ORIGIN}

ADMIN = {"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"}
CUSTOMER = {"email": "testcustomer@velora.com", "password": "TestPass123!"}


def cors(res: httpx.Response) -> str | None:
    return res.headers.get("access-control-allow-origin")


def test_status_codes_no_auth() -> None:
    print("\n=== UNAUTHENTICATED (expect 401 + CORS) ===")
    for path in ["/admin/dashboard/stats", "/checkout/validate", "/orders"]:
        r = httpx.post(f"{API}{path}", headers=H) if "validate" in path else httpx.get(f"{API}{path}", headers=H)
        print(f"  {path}: {r.status_code} ACAO={cors(r)}")


def test_admin_flow() -> bool:
    print("\n=== ADMIN: login -> refresh -> dashboard ===")
    with httpx.Client(base_url=API, timeout=30, headers=H) as c:
        login = c.post("/auth/admin/login", json=ADMIN)
        if login.status_code != 200:
            print("  login failed", login.status_code, login.text)
            return False
        token = login.json()["access_token"]
        cookies = c.cookies
        print("  login: 200, admin cookie:", "admin_refresh_token" in cookies)

        # simulate page refresh (memory cleared)
        with httpx.Client(base_url=API, timeout=30, headers=H, cookies=cookies) as refreshed:
            ref = refreshed.post("/auth/admin/refresh")
            print(f"  refresh: {ref.status_code} ACAO={cors(ref)}")
            if ref.status_code != 200:
                return False
            token = ref.json()["access_token"]
            dash = refreshed.get("/admin/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
            print(f"  dashboard: {dash.status_code} ACAO={cors(dash)}")
            if dash.status_code != 200:
                print("  body:", dash.text[:300])
                return False
    return True


def test_customer_flow() -> bool:
    print("\n=== CUSTOMER: login -> refresh -> validate ===")
    with httpx.Client(base_url=API, timeout=30, headers=H) as c:
        login = c.post("/auth/login", json=CUSTOMER)
        if login.status_code == 401:
            reg = c.post("/auth/register", json={"name": "Test Customer", **CUSTOMER})
            if reg.status_code not in (200, 201):
                print("  register/login failed", reg.status_code)
                return False
            token = reg.json()["access_token"]
            cookies = c.cookies
        else:
            if login.status_code != 200:
                print("  login failed", login.status_code)
                return False
            token = login.json()["access_token"]
            cookies = c.cookies

        print("  login: ok, customer cookie:", "refresh_token" in cookies)

        with httpx.Client(base_url=API, timeout=30, headers=H, cookies=cookies) as refreshed:
            ref = refreshed.post("/auth/refresh")
            print(f"  refresh: {ref.status_code} ACAO={cors(ref)}")
            if ref.status_code != 200:
                return False
            token = ref.json()["access_token"]
            me = refreshed.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            print(f"  /auth/me: {me.status_code} ACAO={cors(me)}")
            val = refreshed.post("/checkout/validate", headers={"Authorization": f"Bearer {token}"})
            print(f"  checkout/validate: {val.status_code} ACAO={cors(val)}")
            if val.status_code != 200:
                print("  body:", val.text[:300])
                return False
    return True


def test_options_preflight() -> None:
    print("\n=== OPTIONS preflight ===")
    r = httpx.options(
        f"{API}/admin/dashboard/stats",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    print(f"  OPTIONS dashboard: {r.status_code} ACAO={cors(r)} ACAM={r.headers.get('access-control-allow-methods')}")


def main() -> int:
    test_status_codes_no_auth()
    test_options_preflight()
    ok_admin = test_admin_flow()
    ok_customer = test_customer_flow()
    print("\n=== RESULT ===")
    print("admin:", "PASS" if ok_admin else "FAIL")
    print("customer:", "PASS" if ok_customer else "FAIL")
    return 0 if ok_admin and ok_customer else 1


if __name__ == "__main__":
    sys.exit(main())

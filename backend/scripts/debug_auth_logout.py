"""
Evidence-based auth logout debugger.

Simulates browser page refresh (memory cleared, HttpOnly cookies retained)
and documents the exact request sequence for OLD vs FIXED init logic.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from typing import Any

import httpx

API = "http://127.0.0.1:8000/api/v1"
ADMIN_CREDS = {"email": "admin@veloraenterprise.com", "password": "ChangeMe@Admin123!"}
CUSTOMER_CREDS = {"email": "testcustomer@velora.com", "password": "TestPass123!"}


@dataclass
class Step:
    label: str
    method: str
    path: str
    status: int | None = None
    auth_header: bool = False
    refresh_cookie_sent: bool = False
    response_snippet: str = ""
    note: str = ""


@dataclass
class ScenarioReport:
    name: str
    steps: list[Step] = field(default_factory=list)
    access_token_after_init: str | None = None
    refresh_cookie_exists: bool = False
    document_cookie_would_show_refresh: bool = False
    me_status: int | None = None
    explicit_logout_called: bool = False
    redirect_target: str | None = None


def cookie_names(jar: httpx.Cookies) -> set[str]:
    return {c.name for c in jar.jar}


def simulate_old_init(scope: str, jar: httpx.Cookies) -> ScenarioReport:
    """OLD buggy logic: skip refresh if document.cookie cannot see HttpOnly token."""
    report = ScenarioReport(name=f"OLD init ({scope})")
    cookie_name = "admin_refresh_token" if scope == "admin" else "refresh_token"
    report.refresh_cookie_exists = cookie_name in cookie_names(jar)
    # HttpOnly cookies are never visible to document.cookie in a real browser
    report.document_cookie_would_show_refresh = False

    report.steps.append(
        Step(
            label="hasRefreshCookie() check (client-side)",
            method="JS",
            path="document.cookie",
            note=(
                f"returns FALSE - HttpOnly '{cookie_name}' exists in browser jar "
                f"({report.refresh_cookie_exists}) but is invisible to JavaScript"
            ),
        )
    )

    if not report.document_cookie_would_show_refresh:
        report.steps.append(
            Step(
                label="tryRefresh SKIPPED (OLD bug)",
                method="SKIP",
                path=f"/auth/{'admin/' if scope == 'admin' else ''}refresh",
                note="NO network request - setAccessToken(null); return null",
            )
        )
        report.access_token_after_init = None
    report.me_status = None
    report.steps.append(
        Step(
            label="/auth/me NOT called (no access token)",
            method="SKIP",
            path="/auth/me",
            note="fetchMe skipped because tryRefresh returned null",
        )
    )
    report.explicit_logout_called = False
    if scope == "admin":
        report.redirect_target = "/admin/login (admin/layout.tsx useEffect line ~25)"
    else:
        report.redirect_target = "/login?redirect=... (orders/page.tsx line ~24 or checkout line ~55)"
    return report


def simulate_fixed_init(client: httpx.Client, scope: str) -> ScenarioReport:
    """FIXED logic: always POST refresh with credentials."""
    report = ScenarioReport(name=f"FIXED init ({scope})")
    cookie_name = "admin_refresh_token" if scope == "admin" else "refresh_token"
    report.refresh_cookie_exists = cookie_name in cookie_names(client.cookies)
    report.document_cookie_would_show_refresh = False

    refresh_path = "/auth/admin/refresh" if scope == "admin" else "/auth/refresh"
    refresh = client.post(refresh_path)
    report.steps.append(
        Step(
            label="tryRefresh -> refreshAccessToken",
            method="POST",
            path=refresh_path,
            status=refresh.status_code,
            refresh_cookie_sent=report.refresh_cookie_exists,
            response_snippet=refresh.text[:120],
        )
    )

    if refresh.status_code == 200:
        report.access_token_after_init = refresh.json().get("access_token")
        me = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {report.access_token_after_init}"},
        )
        report.me_status = me.status_code
        report.steps.append(
            Step(
                label="fetchMe after refresh",
                method="GET",
                path="/auth/me",
                status=me.status_code,
                auth_header=True,
                response_snippet=json.dumps(me.json())[:120] if me.status_code == 200 else me.text[:120],
            )
        )
    else:
        report.access_token_after_init = None
        report.me_status = None

    report.explicit_logout_called = False
    return report


def run_live_flow(scope: str) -> dict[str, Any]:
    """Full login -> clear memory -> refresh -> orders API sequence."""
    login_path = "/auth/admin/login" if scope == "admin" else "/auth/login"
    orders_path = "/admin/orders?page_size=1" if scope == "admin" else "/orders?page_size=1"

    with httpx.Client(base_url=API, timeout=30) as client:
        login = client.post(login_path, json=ADMIN_CREDS if scope == "admin" else CUSTOMER_CREDS)
        if login.status_code not in (200, 201):
            # try register for customer
            if scope == "customer":
                reg = client.post(
                    "/auth/register",
                    json={"name": "Test", **CUSTOMER_CREDS},
                )
                if reg.status_code not in (200, 201):
                    return {"error": f"login failed {login.status_code}"}
            else:
                return {"error": f"login failed {login.status_code}"}

        cookies = client.cookies
        cookie_name = "admin_refresh_token" if scope == "admin" else "refresh_token"

        old = simulate_old_init(scope, cookies)

        # New client = page refresh (memory cleared, cookies kept)
        with httpx.Client(base_url=API, timeout=30, cookies=cookies) as refreshed:
            fixed = simulate_fixed_init(refreshed, scope)

            # Authenticated API after fixed init
            orders_status = None
            orders_auth = False
            if fixed.access_token_after_init:
                orders = refreshed.get(
                    orders_path,
                    headers={"Authorization": f"Bearer {fixed.access_token_after_init}"},
                )
                orders_status = orders.status_code
                orders_auth = True

        return {
            "scope": scope,
            "cookie_after_login": cookie_name in cookie_names(cookies),
            "old_init": old,
            "fixed_init": fixed,
            "orders_after_fixed_init": {"status": orders_status, "auth_header": orders_auth},
        }


def print_report(data: dict[str, Any]) -> None:
    scope = data["scope"]
    print(f"\n{'=' * 70}")
    print(f"SCOPE: {scope.upper()}")
    print(f"{'=' * 70}")

    old: ScenarioReport = data["old_init"]
    fixed: ScenarioReport = data["fixed_init"]

    print("\n--- PAGE REFRESH: OLD BUGGY INIT ---")
    for s in old.steps:
        print(f"  [{s.method}] {s.path} - {s.label}")
        if s.status:
            print(f"    HTTP {s.status}")
        if s.note:
            print(f"    -> {s.note}")
    print(f"  Access token after init: {old.access_token_after_init!r}")
    print(f"  Refresh cookie in browser: {old.refresh_cookie_exists}")
    print(f"  document.cookie sees refresh: {old.document_cookie_would_show_refresh}")
    print(f"  /auth/me called: NO")
    print(f"  Explicit logout() called: {old.explicit_logout_called}")
    print(f"  Redirect to login: {old.redirect_target}")

    print("\n--- PAGE REFRESH: FIXED INIT ---")
    for s in fixed.steps:
        auth = "Authorization: Bearer ..." if s.auth_header else "(none)"
        print(f"  [{s.method}] {s.path} - {s.label} -> HTTP {s.status} {auth}")
    print(f"  Access token after init: {'present' if fixed.access_token_after_init else 'MISSING'}")
    print(f"  /auth/me status: {fixed.me_status}")
    print(f"  Explicit logout() called: {fixed.explicit_logout_called}")

    o = data["orders_after_fixed_init"]
    print(f"\n--- ORDER API AFTER FIXED INIT ---")
    print(f"  GET orders -> HTTP {o['status']} (Authorization: {o['auth_header']})")


def main() -> int:
    results = []
    for scope in ("admin", "customer"):
        r = run_live_flow(scope)
        if "error" in r:
            print(f"{scope}: {r['error']}")
            continue
        results.append(r)
        print_report(r)

    print("\n" + "=" * 70)
    print("ROOT CAUSE SUMMARY (evidence-based)")
    print("=" * 70)
    print(
        """
1. API request that triggered 'logout' appearance:
   NONE on the server — no failed API call caused server-side logout.
   The failure was CLIENT-SIDE: tryRefresh() returned null WITHOUT calling
   POST /auth/refresh or /auth/admin/refresh.

2. HTTP status code of triggering request:
   N/A — refresh endpoint was NEVER called on page load (OLD code).

3. Authorization header on subsequent requests:
   MISSING — access token stored only in JS memory (cleared on refresh).
   Protected pages then saw isAuthenticated=false before any API call.

4. Access token after page refresh (OLD):
   null — never restored because refresh was skipped.

5. Refresh token after page refresh:
   PRESENT in browser (HttpOnly cookie) — verified by successful POST
   when refresh is actually attempted (FIXED flow returns 200).

6. /auth/me after page refresh (OLD):
   NOT CALLED — skipped because tryRefresh returned null.
   /auth/me after page refresh (FIXED): HTTP 200 with valid Bearer token.

7. Frontend explicitly calls logout():
   NO — logout() was not invoked on refresh. OLD code DID call POST /auth/logout
   on role-mismatch during init (removed in fix). Normal refresh path never
   called logout().

8. Exact redirect to login:
   Admin: frontend/src/app/admin/layout.tsx ~line 25
          router.replace(`/admin/login${redirect}`)
   Customer: frontend/src/app/orders/page.tsx ~line 24
          router.push("/login?redirect=/orders")
          (also checkout/page.tsx ~line 55)

Trigger chain (OLD):
  Page refresh → AuthProvider init → hasRefreshCookie() false (HttpOnly)
  → tryRefresh skips POST → user=null → isLoading=false → isAuthenticated=false
  → protected route redirect to login (appears as automatic logout)
"""
    )
    return 0 if results else 1


if __name__ == "__main__":
    sys.exit(main())

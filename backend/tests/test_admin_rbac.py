"""RBAC tests for admin and customer-only endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_admin_dashboard_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/admin/dashboard/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_messages_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/admin/messages")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_public_config_no_auth(client: AsyncClient):
    response = await client.get("/api/v1/config")
    assert response.status_code == 200
    data = response.json()
    assert "shipping_flat_rate" in data
    assert "free_shipping_min_order" in data
    assert "online_payment_available" in data


@pytest.mark.asyncio
async def test_checkout_validate_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/checkout/validate")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_customer_login_rejects_admin(client: AsyncClient):
    import os
    from dotenv import dotenv_values

    env = dotenv_values(".env")
    admin_email = env.get("ADMIN_EMAIL", "admin@veloraenterprise.com")
    admin_pass = env.get("ADMIN_PASSWORD", "ChangeMe@Admin123!")

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": admin_pass},
    )
    assert response.status_code == 403
    assert "admin/login" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_orders_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/admin/orders")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_order_status_requires_auth(client: AsyncClient):
    import uuid

    response = await client.patch(
        f"/api/v1/admin/orders/{uuid.uuid4()}/status",
        json={"status": "confirmed"},
    )
    assert response.status_code == 401


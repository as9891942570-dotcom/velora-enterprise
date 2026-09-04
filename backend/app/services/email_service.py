"""Reusable email delivery via Resend HTTP API (password resets + order notifications)."""

from __future__ import annotations

import logging
from html import escape

import resend

from app.core.config import settings
from app.models.order import Order

logger = logging.getLogger(__name__)


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Send an email via Resend. Returns True on success. Never raises to callers."""
    if not settings.email_enabled:
        logger.warning(
            "RESEND_API_KEY is not configured — skipping email to %s (%s)",
            to_email,
            subject,
        )
        return False

    try:
        resend.api_key = settings.resend_api_key
        params: dict = {
            "from": settings.effective_from_email,
            "to": [to_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            params["html"] = html_body

        result = resend.Emails.send(params)
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        logger.info("Email sent via Resend to %s subject=%s id=%s", to_email, subject, email_id)
        return True
    except Exception:
        logger.exception("Failed to send email via Resend to %s subject=%s", to_email, subject)
        return False


def send_password_reset_email(*, to_email: str, name: str, reset_url: str, scope: str) -> bool:
    audience = "admin account" if scope == "admin" else "account"
    subject = "Reset Your Password - Velora Enterprise"
    text_body = (
        f"Hello {name},\n\n"
        f"We received a request to reset your Velora Enterprise {audience} password.\n\n"
        f"Open this link to set a new password (expires soon):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n\n"
        "Thank you,\nVelora Enterprise\n"
    )
    html_body = f"""
    <p>Hello {escape(name)},</p>
    <p>We received a request to reset your Velora Enterprise {escape(audience)} password.</p>
    <p><a href="{escape(reset_url)}">Reset your password</a></p>
    <p>This link expires soon and can only be used once.</p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Thank you,<br/>Velora Enterprise</p>
    """
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def _format_address(address: dict | None) -> str:
    if not address:
        return "—"
    parts = [
        address.get("full_name"),
        address.get("line1"),
        address.get("line2"),
        address.get("landmark"),
        ", ".join(
            p
            for p in [
                address.get("city"),
                address.get("state"),
                address.get("pincode"),
            ]
            if p
        ),
        address.get("country"),
        f"Phone: {address.get('phone')}" if address.get("phone") else None,
    ]
    return "\n".join(str(p) for p in parts if p)


def _format_address_html(address: dict | None) -> str:
    return "<br/>".join(escape(line) for line in _format_address(address).splitlines())


def _product_lines(order: Order) -> list[str]:
    lines: list[str] = []
    for item in order.items:
        lines.append(
            f"- {item.product_name} × {item.quantity} @ ₹{item.unit_price} = ₹{item.line_total}"
        )
    return lines


def send_admin_new_order_email(order: Order) -> bool:
    to_email = settings.admin_notification_email or settings.support_email
    subject = "New Order Received - Velora Enterprise"
    products = "\n".join(_product_lines(order))
    address = _format_address(order.shipping_address if isinstance(order.shipping_address, dict) else None)
    payment_method = order.payment_method.value if hasattr(order.payment_method, "value") else str(order.payment_method)
    payment_status = order.payment_status.value if hasattr(order.payment_status, "value") else str(order.payment_status)
    order_status = order.status.value if hasattr(order.status, "value") else str(order.status)
    created = order.created_at.isoformat() if order.created_at else "—"

    text_body = f"""New Order Received!

Order Number: #{order.order_number}
Order Date: {created}
Order Status: {order_status}

Customer Details:
Name: {order.customer_name}
Email: {order.customer_email}
Phone: {order.customer_phone}

Delivery Address:
{address}

Products:
{products}

Subtotal: ₹{order.subtotal}
Shipping: ₹{order.shipping_amount}
Discount: ₹{order.discount_amount}
Total Amount: ₹{order.total_amount}

Payment Method: {payment_method}
Payment Status: {payment_status}
"""
    html_products = "".join(
        f"<li>{escape(item.product_name)} × {item.quantity} — ₹{item.line_total}</li>"
        for item in order.items
    )
    html_body = f"""
    <h2>New Order Received!</h2>
    <p><strong>Order Number:</strong> #{escape(order.order_number)}</p>
    <p><strong>Order Date:</strong> {escape(created)}</p>
    <p><strong>Order Status:</strong> {escape(order_status)}</p>
    <h3>Customer Details</h3>
    <p>
      Name: {escape(order.customer_name)}<br/>
      Email: {escape(order.customer_email)}<br/>
      Phone: {escape(order.customer_phone)}
    </p>
    <h3>Delivery Address</h3>
    <p>{_format_address_html(order.shipping_address if isinstance(order.shipping_address, dict) else None)}</p>
    <h3>Products</h3>
    <ul>{html_products}</ul>
    <p>
      Subtotal: ₹{order.subtotal}<br/>
      Shipping: ₹{order.shipping_amount}<br/>
      Discount: ₹{order.discount_amount}<br/>
      <strong>Total Amount: ₹{order.total_amount}</strong>
    </p>
    <p>
      Payment Method: {escape(payment_method)}<br/>
      Payment Status: {escape(payment_status)}
    </p>
    """
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_customer_order_confirmation_email(order: Order) -> bool:
    subject = "Your Order Has Been Received - Velora Enterprise"
    products = "\n".join(
        f"- {item.product_name} × {item.quantity}" for item in order.items
    )
    address = _format_address(order.shipping_address if isinstance(order.shipping_address, dict) else None)
    payment_method = order.payment_method.value if hasattr(order.payment_method, "value") else str(order.payment_method)
    order_status = order.status.value if hasattr(order.status, "value") else str(order.status)

    text_body = f"""Hello {order.customer_name},

Thank you for shopping with Velora Enterprise!

Your order has been successfully received.

Order Number: #{order.order_number}
Order Status: {order_status}

Products:
{products}

Total Amount: ₹{order.total_amount}
Payment Method: {payment_method}

Delivery Address:
{address}

You can track your order from your account.

Thank you,
Velora Enterprise
"""
    html_products = "".join(
        f"<li>{escape(item.product_name)} × {item.quantity}</li>" for item in order.items
    )
    html_body = f"""
    <p>Hello {escape(order.customer_name)},</p>
    <p>Thank you for shopping with Velora Enterprise!</p>
    <p>Your order has been successfully received.</p>
    <p><strong>Order Number:</strong> #{escape(order.order_number)}<br/>
       <strong>Order Status:</strong> {escape(order_status)}</p>
    <p><strong>Products</strong></p>
    <ul>{html_products}</ul>
    <p><strong>Total Amount:</strong> ₹{order.total_amount}<br/>
       <strong>Payment Method:</strong> {escape(payment_method)}</p>
    <p><strong>Delivery Address</strong><br/>{_format_address_html(order.shipping_address if isinstance(order.shipping_address, dict) else None)}</p>
    <p>You can track your order from your account.</p>
    <p>Thank you,<br/>Velora Enterprise</p>
    """
    return send_email(
        to_email=order.customer_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )

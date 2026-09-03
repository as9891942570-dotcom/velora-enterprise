from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Velora Enterprise API"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://velora:velora_dev@localhost:5432/velora"
    secret_key: str = "change-me-in-production"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    frontend_url: str = "http://localhost:3000"
    support_email: str = "veloraenterprise2@gmail.com"
    admin_notification_email: str = "veloraenterprise2@gmail.com"

    # SMTP (optional — emails skipped when not configured)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Velora Enterprise"
    smtp_use_tls: bool = True

    # Password reset
    password_reset_expire_minutes: int = 60

    # JWT
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # Business rules
    shipping_flat_rate: float = 99.0
    free_shipping_min_order: float = 999.0
    low_stock_threshold: int = 5
    guest_cart_expiry_days: int = 30

    # Admin bootstrap (CLI seed only — never commit real values)
    admin_email: str = ""
    admin_password: str = ""
    admin_name: str = "Admin"

    # Razorpay (optional)
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # Cloudinary (optional)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def razorpay_enabled(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

    @property
    def effective_from_email(self) -> str:
        return self.smtp_from_email or self.support_email


settings = Settings()

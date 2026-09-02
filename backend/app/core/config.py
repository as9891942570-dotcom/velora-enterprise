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
    support_email: str = "support@veloraenterprise.com"

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


settings = Settings()

from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "dev")
    admin_api_key: str = os.getenv("ADMIN_API_KEY", "change-me")

    database_url: str = os.getenv("DATABASE_URL", "")

    shopify_shop_domain: str = os.getenv("SHOPIFY_SHOP_DOMAIN", "")
    shopify_admin_access_token: str = os.getenv("SHOPIFY_ADMIN_ACCESS_TOKEN", "")
    shopify_webhook_secret: str = os.getenv("SHOPIFY_WEBHOOK_SECRET", "")

settings = Settings()

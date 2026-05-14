from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, case_sensitive=False, extra='ignore')

    anthropic_api_key: str = ""
    data_mode: str = "mock"  # "mock" | "lakehouse"

    # Fabric Lakehouse (only needed when data_mode=lakehouse)
    fabric_sql_endpoint: str = ""
    fabric_database: str = ""
    fabric_client_id: str = ""
    fabric_client_secret: str = ""
    fabric_tenant_id: str = ""

settings = Settings()


def missing_lakehouse_settings() -> list[str]:
    required = {
        "fabric_sql_endpoint": settings.fabric_sql_endpoint,
        "fabric_database": settings.fabric_database,
        "fabric_client_id": settings.fabric_client_id,
        "fabric_client_secret": settings.fabric_client_secret,
        "fabric_tenant_id": settings.fabric_tenant_id,
    }
    return [name for name, value in required.items() if not value]

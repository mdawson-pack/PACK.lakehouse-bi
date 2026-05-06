from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    anthropic_api_key: str = ""
    data_mode: str = "mock"  # "mock" | "lakehouse"

    # Fabric Lakehouse (only needed when data_mode=lakehouse)
    fabric_sql_endpoint: str = ""
    fabric_database: str = ""
    fabric_client_id: str = ""
    fabric_client_secret: str = ""
    fabric_tenant_id: str = ""

settings = Settings()

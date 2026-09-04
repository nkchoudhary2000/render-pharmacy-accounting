import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Pharmacy Accounting & Management API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Database connection URL (supports Neon PostgreSQL with asyncpg)
    DATABASE_URL: str = "sqlite+aiosqlite:///./pharmacy.db"
    
    # JWT Authentication
    JWT_SECRET: str = "pharmacy_accounting_super_secret_jwt_key_2025_secure_xyz_token"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS Origins
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        import re
        if not v or v.strip() == "":
            return "sqlite+aiosqlite:///./pharmacy.db"
        
        url = v.strip()
        # Normalize postgres driver for asyncpg
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        # Asyncpg uses ?ssl=require rather than ?sslmode=require
        if "sslmode=require" in url:
            url = url.replace("sslmode=require", "ssl=require")
        elif "neon.tech" in url and "ssl=" not in url:
            connector = "&" if "?" in url else "?"
            url = f"{url}{connector}ssl=require"

        # Strip channel_binding which is not an asyncpg parameter
        url = re.sub(r'[&?]channel_binding=[^&]+', '', url)
        if '?' not in url and '&' in url:
            url = url.replace('&', '?', 1)
            
        return url

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        env_file = [".env", "backend/.env"]
        extra = "ignore"

settings = Settings()

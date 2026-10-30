# Security module
import secrets

ADMIN_API_KEY = "facesense-admin-key"

def verify_admin_key(api_key: str) -> bool:
    if not api_key:
        return False
    return secrets.compare_digest(api_key, ADMIN_API_KEY)


"""
JWT verification for Supabase-issued tokens.

Supports both asymmetric keys (ES256/RS256) via JWKS and legacy symmetric keys (HS256) via the shared secret.
"""
import base64
import httpx
from jose import JWTError, jwt, jwk

from app.core.config import settings

# Global cache for JWKS keys: kid -> jwk_dict
_jwks_cache: dict[str, dict] = {}
_jwks_fetched = False


def fetch_jwks_sync() -> None:
    global _jwks_fetched
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(jwks_url)
            if response.status_code == 200:
                data = response.json()
                for key_dict in data.get("keys", []):
                    kid = key_dict.get("kid")
                    if kid:
                        _jwks_cache[kid] = key_dict
                _jwks_fetched = True
    except Exception as e:
        print(f"Warning: Failed to fetch JWKS keys from {jwks_url}: {e}")


def decode_supabase_token(token: str) -> dict:
    """
    Decode and verify a Supabase-issued JWT.

    Returns the decoded claims dict.

    Raises
    ------
    JWTError  if the token is invalid, expired, or has a bad signature.
    """
    global _jwks_fetched
    try:
        headers = jwt.get_unverified_header(token)
    except Exception as e:
        raise JWTError("Invalid token headers") from e

    kid = headers.get("kid")
    alg = headers.get("alg", "HS256")

    # If asymmetric validation (ES256/RS256) is indicated by the headers
    if kid and alg in ("ES256", "RS256"):
        if kid not in _jwks_cache:
            fetch_jwks_sync()

        jwk_dict = _jwks_cache.get(kid)
        if jwk_dict:
            try:
                key = jwk.construct(jwk_dict)
                return jwt.decode(
                    token,
                    key,
                    algorithms=[alg],
                    audience="authenticated",
                )
            except Exception as e:
                raise JWTError(f"Asymmetric token verification failed: {e}") from e

    # Fallback: legacy HS256 validation using the shared secret
    secret = settings.supabase_jwt_secret
    try:
        # Supabase signs HS256 tokens using the base64-decoded secret bytes.
        key = base64.b64decode(secret)
    except Exception:
        key = secret.encode("utf-8")

    return jwt.decode(
        token,
        key,
        algorithms=["HS256"],
        audience="authenticated",
    )

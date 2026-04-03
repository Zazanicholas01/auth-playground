import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Iterable

from fastapi import HTTPException, Request, status

from app.settings import settings


@dataclass(slots=True)
class CurrentUser:
    user_id: str
    username: str | None
    email: str | None
    role: str
    roles: tuple[str, ...]


def _base64url_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()

    cookie_token = request.cookies.get("iot_access_token")
    if cookie_token:
        return cookie_token

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing-token")


def _verify_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid-token")

    header_segment, payload_segment, signature_segment = parts
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    actual_signature = _base64url_decode(signature_segment)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid-signature")

    try:
        header = json.loads(_base64url_decode(header_segment))
        payload = json.loads(_base64url_decode(payload_segment))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid-token") from exc

    if header.get("alg") != "HS256":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unsupported-algorithm")

    now = int(time.time())
    if payload.get("exp") is not None and int(payload["exp"]) <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token-expired")

    if payload.get("nbf") is not None and int(payload["nbf"]) > now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token-not-yet-valid")

    issuer = payload.get("iss")
    if settings.jwt_issuer and issuer != settings.jwt_issuer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid-issuer")

    audience = payload.get("aud")
    if settings.jwt_audience:
        if isinstance(audience, list):
            valid_audience = settings.jwt_audience in audience
        else:
            valid_audience = audience == settings.jwt_audience
        if not valid_audience:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid-audience")

    return payload


def require_authenticated_user(request: Request) -> CurrentUser:
    payload = _verify_token(_extract_token(request))
    role = payload.get("role") or "guest"
    payload_roles = payload.get("roles") or [role]
    roles = tuple(str(item) for item in payload_roles if item)

    return CurrentUser(
        user_id=str(payload.get("sub") or ""),
        username=payload.get("username"),
        email=payload.get("email"),
        role=role,
        roles=roles or (role,),
    )


def require_roles(user: CurrentUser, allowed_roles: Iterable[str]) -> CurrentUser:
    allowed = {role for role in allowed_roles}
    if user.role in allowed or any(role in allowed for role in user.roles):
        return user

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

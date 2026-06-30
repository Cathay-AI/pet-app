"""Shared Pydantic schemas reused across multiple domain modules."""
from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Generic success message returned by endpoints that don't need a body."""

    message: str

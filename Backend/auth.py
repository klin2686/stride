import hashlib
import secrets


def hash_password(password: str) -> str:
    """Return 'salt:sha256_hex' — salt is a 32-byte random hex string."""
    salt = secrets.token_hex(32)
    digest = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Re-derive the hash using the stored salt and compare."""
    salt, digest = stored_hash.split(":", 1)
    candidate = hashlib.sha256((salt + password).encode()).hexdigest()
    return secrets.compare_digest(candidate, digest)

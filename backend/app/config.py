import os
from pathlib import Path

# Your production domain, without a trailing slash. Used for canonical URLs,
# JSON-LD and the sitemap. Set it before building for production:
#   SITE_URL=https://www.yourdomain.com python -m app.export
SITE_URL = os.environ.get("SITE_URL", "https://www.example.com").rstrip("/")

# Where `python -m app.export` writes the frontend's content.
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", Path(__file__).resolve().parents[2] / "frontend"))

# Origins allowed to call the API during development.
CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://127.0.0.1:5190,http://localhost:5190,http://127.0.0.1:4190,http://localhost:4190",
).split(",")

# Where the admin saves recipe photos (served by the frontend as /images/recipes/...).
IMAGES_DIR = FRONTEND_DIR / "public" / "images" / "recipes"

# The local dev site, for "View on site" links in the admin.
DEV_SITE_URL = os.environ.get("DEV_SITE_URL", "http://127.0.0.1:5190")

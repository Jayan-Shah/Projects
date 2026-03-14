# /intake-service/app/minio_client.py

import os
from minio import Minio

# --- Configuration ---
# These variables are read from the environment variables passed by docker-compose
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "incidents")

# --- Initialize the MinIO Client ---
# This client object will be a singleton, imported by other parts of the service.
try:
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False  # Set to False because we are communicating within the secure Docker network
    )
    print("Successfully initialized MinIO client.")
except Exception as e:
    print(f"CRITICAL ERROR: Could not initialize MinIO client: {e}")
    client = None


# --- Bucket Creation on Startup ---
# This is an idempotent operation that ensures our storage bucket exists before we need it.
if client:
    try:
        found = client.bucket_exists(MINIO_BUCKET)
        if not found:
            client.make_bucket(MINIO_BUCKET)
            print(f"Created MinIO bucket: '{MINIO_BUCKET}'")
        else:
            print(f"MinIO bucket '{MINIO_BUCKET}' already exists.")
    except Exception as e:
        print(f"Error checking or creating MinIO bucket: {e}")
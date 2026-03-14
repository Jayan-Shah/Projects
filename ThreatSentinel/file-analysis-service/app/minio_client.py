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
client = None # Define client initially as None
try:
    # This is the line that actually creates the 'client' object that main_consumer wants to import
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False  # Set to False because we are communicating within the secure Docker network
    )
    print("File-Analysis-Service: Successfully initialized MinIO client.")
except Exception as e:
    print(f"CRITICAL ERROR (File-Analysis-Service): Could not initialize MinIO client: {e}")


# --- Bucket Creation on Startup ---
# This is an idempotent operation that ensures our storage bucket exists before we need it.
if client:
    try:
        found = client.bucket_exists(MINIO_BUCKET)
        if not found:
            # This is unlikely to run if the intake-service has already run, but it's good practice
            client.make_bucket(MINIO_BUCKET)
            print(f"File-Analysis-Service: Created MinIO bucket: '{MINIO_BUCKET}'")
        else:
            print(f"File-Analysis-Service: MinIO bucket '{MINIO_BUCKET}' already exists.")
    except Exception as e:
        print(f"File-Analysis-Service: Error checking or creating MinIO bucket: {e}")
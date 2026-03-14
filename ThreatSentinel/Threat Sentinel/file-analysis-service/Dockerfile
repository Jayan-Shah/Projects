# /file-analysis-service/Dockerfile

FROM python:3.11-slim

# --- Install system dependencies required by Python libraries ---
RUN apt-get update && apt-get install -y libmagic1 && rm -rf /var/lib/apt/lists/*

WORKDIR /code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /code/app

# Set the PYTHONPATH to include the shared common_app library
ENV PYTHONPATH=/code:/code/app:/code/common_app

CMD ["python", "-u", "app/main_consumer.py"]
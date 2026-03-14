# Use the same base image for consistency
FROM python:3.11-slim

# Set the working directory
WORKDIR /code

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ...
COPY ./app /code/app
ENV PYTHONPATH=/code:/code/app:/code/common_app
CMD ["python", "-u", "app/main_consumer.py"]
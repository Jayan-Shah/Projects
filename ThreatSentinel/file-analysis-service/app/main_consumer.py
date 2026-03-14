# /file-analysis-service/app/main_consumer.py

import pika
import json
import time
from sqlalchemy.orm import Session
from io import BytesIO

import analysis
import crud
import producer
from minio_client import client as minio_client, MINIO_BUCKET
from common_app.database import SessionLocal
from common_app.schemas import IncidentStatus

RABBITMQ_HOST = 'rabbitmq'
QUEUE_NAME = 'analysis_queue'

def callback(ch, method, properties, body):
    print("\n=============================================")
    print(f" [x] Received new analysis task...")
    
    db = SessionLocal()
    message = json.loads(body)
    incident_id = message.get("incident_id")

    # If it's a URL submission, requeue it for the url-analysis-service to handle
    if "submitted_url" in message:
        print(f" [i] Task is for a URL. Requeueing for other consumers.")
        # Nack and requeue the message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        return
        
    try:
        file_object_name = message.get("file_object_name")
        content_type = message.get("content_type")

        if not incident_id or not file_object_name:
            print(" [!] Invalid message format. Discarding.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Perform the analysis
        print(f" [->] Fetching file '{file_object_name}' from MinIO.")
        file_data = minio_client.get_object(MINIO_BUCKET, file_object_name)
        file_stream = BytesIO(file_data.read())
        
        print(f" [->] Analyzing file for incident {incident_id}.")
        analysis_result = analysis.analyze_file(file_stream, content_type)
        
        # Persist results to the database
        print(f" [->] Saving analysis results to database.")
        updated_incident = crud.update_incident_analysis(
            db=db,
            incident_id=incident_id,
            status=IncidentStatus.ANALYSIS_COMPLETE,
            result=analysis_result
        )
        
        # Publish notification task
        if updated_incident and updated_incident.analysis_result:
            notification_task = {
                "incident_id": str(updated_incident.id),
                "submitted_by": updated_incident.submitted_by,
                "final_verdict": updated_incident.analysis_result.get("final_verdict", "unknown"),
                "incident_type": "file",
                "submitted_text": updated_incident.submitted_text # Pass the filename
            }
            producer.publish_notification_task(notification_task)
        
        print(f" [✓] File analysis complete for incident {incident_id}.")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f" [!] An unexpected error occurred: {e}")
        # Acknowledge to prevent poison pills
        ch.basic_ack(delivery_tag=method.delivery_tag)
    finally:
        db.close()

# --- The start_consuming() function remains the same as in your other consumers ---
# (Include the full start_consuming function here)
def start_consuming():
    """Starts the consumer loop, waiting for messages, with connection retries."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            print(' [*] File Analysis Service waiting for tasks. To exit press CTRL+C')
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError as e:
            print(f"Connection to RabbitMQ failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"An unexpected error occurred in start_consuming: {e}. Restarting consumer...")
            time.sleep(5)

if __name__ == '__main__':
    start_consuming()
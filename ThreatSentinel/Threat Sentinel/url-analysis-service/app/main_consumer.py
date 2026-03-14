import pika
import json
import time
import analysis
import crud
import producer
from common_app.database import SessionLocal # Corrected import from local database.py
from common_app.schemas import IncidentStatus

RABBITMQ_HOST = 'rabbitmq'
QUEUE_NAME = 'analysis_queue'

def callback(ch, method, properties, body):
    print("\n=============================================")
    print(f" [x] URL-Analysis received new task...")
    
    db = SessionLocal()
    try:
        message = json.loads(body)
        incident_id = message.get("incident_id")
        url_to_analyze = message.get("submitted_url")

        # --- THIS IS THE CRITICAL FIX ---
        # If the message is for a file (no URL), NACK and REQUEUE it.
        if not url_to_analyze:
            print(f" [i] Task is for a file. Requeueing for other consumers.")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            return
        # --- END OF CRITICAL FIX ---

        # If we reach here, it's a URL task, so we process it.
        if not incident_id:
            print(" [!] No incident_id in message. Acknowledging and skipping.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Perform the core analysis
        analysis_result = analysis.analyze_url(url_to_analyze)
        
        # Persist the results to the database
        print(f" [✓] Saving analysis for incident {incident_id} to database.")
        updated_incident = crud.update_incident_analysis(
            db=db,
            incident_id=incident_id,
            status=IncidentStatus.ANALYSIS_COMPLETE,
            result=analysis_result
        )
        
        # If the database update was successful, publish the next task
        if updated_incident and updated_incident.analysis_result:
            notification_task = {
                "incident_id": str(updated_incident.id),
                "submitted_by": updated_incident.submitted_by,
                "url": updated_incident.submitted_url,
                "final_verdict": updated_incident.analysis_result.get("final_verdict", "unknown")
            }
            producer.publish_notification_task(notification_task)
        else:
             print(f" [!] Could not retrieve updated incident {incident_id} from DB. Skipping notification.")

        print(f"\n[✓] Full URL processing complete for incident {incident_id}.")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError:
        print(" [!] Failed to decode message body. Discarding message.")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f" [!] An unexpected error occurred during callback processing: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag) # Ack to prevent poison pill
    finally:
        db.close() # Always ensure the database session is closed.

# ... (The rest of the file, start_consuming(), remains unchanged)
def start_consuming():
    """Starts the consumer loop, waiting for messages, with connection retries."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            print(' [*] URL Analysis Service waiting for tasks. To exit press CTRL+C')
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
    try:
        start_consuming()
    except KeyboardInterrupt:
        print('Interrupted by user.')
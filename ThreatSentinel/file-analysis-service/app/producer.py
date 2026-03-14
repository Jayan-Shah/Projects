# /file-analysis-service/app/producer.py

import pika
import json
import os

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
NOTIFICATION_QUEUE_NAME = 'notification_queue'

def publish_notification_task(task_body: dict):
    """Publishes a task for the notification service."""
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        
        # Ensure the notification queue exists and is durable
        channel.queue_declare(queue=NOTIFICATION_QUEUE_NAME, durable=True)
        
        message = json.dumps(task_body)
        
        channel.basic_publish(
            exchange='',
            routing_key=NOTIFICATION_QUEUE_NAME,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2, # Make message persistent
            )
        )
        print(f" [✓] Published notification task for incident {task_body.get('incident_id')}")
        connection.close()
    except Exception as e:
        print(f" [!] ERROR: Could not publish notification task. Reason: {e}")
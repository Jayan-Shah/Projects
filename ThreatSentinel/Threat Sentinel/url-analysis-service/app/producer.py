# in /url-analysis-service/app/producer.py
import pika
import json

RABBITMQ_HOST = 'rabbitmq'
QUEUE_NAME = 'notification_queue'

def publish_notification_task(task_body: dict):
    """Publishes a task for the notification service."""
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    
    message = json.dumps(task_body)
    
    channel.basic_publish(
        exchange='',
        routing_key=QUEUE_NAME,
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print(f" [✓] Published notification task for incident {task_body.get('incident_id')}")
    connection.close()
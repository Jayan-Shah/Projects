# in /notification-service/app/main_consumer.py

import pika
import json
import time
import notifications

RABBITMQ_HOST = 'rabbitmq'
QUEUE_NAME = 'notification_queue'

def callback(ch, method, properties, body):
    """This function is called when a notification task is received."""
    print("\n=============================================")
    print(f" [x] Received new notification task...")
    
    try:
        message = json.loads(body)
        
        # Call the notification logic
        notifications.send_notification(message)

        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(" [✓] Notification processed successfully.")

    except Exception as e:
        print(f" [!] Error processing notification: {e}")
        # In a real system, you might reject and requeue the message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    print("=============================================\n")


def start_consuming():
    """Starts the consumer loop, waiting for messages."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            print(' [*] Waiting for notification tasks. To exit press CTRL+C')
            
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
            
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            print(f"Connection to RabbitMQ failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"An unexpected error occurred: {e}. Restarting consumer...")
            time.sleep(5)

if __name__ == '__main__':
    start_consuming()
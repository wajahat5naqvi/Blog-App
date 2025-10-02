from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import NotificationSerializer


def send_notification_to_user(notification):
    """
    Send a notification to a user through WebSocket
    
    Args:
        notification: Notification instance to send
    """
    channel_layer = get_channel_layer()
    user_id = notification.recipient.id
    
    # Serialize notification
    notification_data = NotificationSerializer(notification).data
    
    # Send to the user's notification group
    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': 'notification_message',
            'notification': notification_data
        }
    )
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications"""

    async def connect(self):
        """Connect to the WebSocket"""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.notification_group_name = f'notifications_{self.user_id}'
        
        # Check if the user_id matches the authenticated user or reject
        if self.scope['user'].is_authenticated:
            if str(self.scope['user'].id) != self.user_id:
                await self.close()
                return
        else:
            await self.close()
            return
        
        # Join the notification group
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Disconnect from the WebSocket"""
        # Leave the notification group
        await self.channel_layer.group_discard(
            self.notification_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle received message"""
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', '')
        
        # Handle message types
        if message_type == 'read_notification':
            notification_id = text_data_json.get('notification_id')
            await self.mark_notification_read(notification_id)
            
            # Send confirmation back to client
            await self.send(text_data=json.dumps({
                'type': 'notification_read',
                'notification_id': notification_id
            }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read"""
        from .models import Notification
        try:
            notification = Notification.objects.get(
                id=notification_id, 
                recipient=self.scope['user']
            )
            notification.read = True
            notification.save(update_fields=['read'])
            return True
        except Notification.DoesNotExist:
            return False
    
    async def notification_message(self, event):
        """Send notification to WebSocket"""
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
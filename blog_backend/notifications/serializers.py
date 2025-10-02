from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications"""
    sender_username = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'message', 'created_at', 'read',
            'redirect_url', 'sender_username', 'sender_profile_picture'
        ]
        read_only_fields = ['id', 'notification_type', 'message', 'created_at', 'redirect_url']
    
    def get_sender_username(self, obj):
        if obj.sender:
            return obj.sender.username
        return None
    
    def get_sender_profile_picture(self, obj):
        if obj.sender and hasattr(obj.sender, 'profile') and obj.sender.profile.profile_picture:
            return obj.sender.profile.profile_picture.url
        return None
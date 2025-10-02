from rest_framework import serializers
from .models import PostView
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

class PostViewSerializer(serializers.ModelSerializer):
    """Serializer for post view tracking"""
    class Meta:
        model = PostView
        fields = ['id', 'post', 'viewed_at', 'user_agent']
        read_only_fields = ['viewed_at']

class PostViewAnalyticsSerializer(serializers.Serializer):
    """Serializer for post view analytics"""
    date = serializers.DateField()
    views_count = serializers.IntegerField()

class UserAnalyticsSerializer(serializers.Serializer):
    """Serializer for user activity analytics"""
    date = serializers.DateField()
    active_users = serializers.IntegerField()
from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin configuration for Notification model"""
    list_display = ('recipient', 'notification_type', 'message', 'created_at', 'read')
    list_filter = ('notification_type', 'read', 'created_at')
    search_fields = ('recipient__username', 'message')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    raw_id_fields = ('recipient', 'sender')
    
    def get_queryset(self, request):
        """Optimize query with select_related for better performance"""
        return super().get_queryset(request).select_related(
            'recipient', 'sender', 'content_type'
        )
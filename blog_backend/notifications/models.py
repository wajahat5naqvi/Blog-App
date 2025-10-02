from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Notification(models.Model):
    """
    Generic notification model for user notifications
    """
    # Notification types
    LIKE = 'like'
    COMMENT = 'comment'
    FOLLOW = 'follow'
    BOOKMARK = 'bookmark'
    MENTION = 'mention'
    SYSTEM = 'system'
    
    NOTIFICATION_TYPES = [
        (LIKE, 'Like'),
        (COMMENT, 'Comment'),
        (FOLLOW, 'Follow'),
        (BOOKMARK, 'Bookmark'),
        (MENTION, 'Mention'),
        (SYSTEM, 'System Message'),
    ]
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='sent_notifications',
        null=True,
        blank=True
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    
    # For linking notification to a specific object (like a post or comment)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # URL to redirect to when notification is clicked
    redirect_url = models.URLField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read', 'created_at']),
        ]
    
    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:50]}"
    
    def mark_as_read(self):
        self.read = True
        self.save(update_fields=['read'])
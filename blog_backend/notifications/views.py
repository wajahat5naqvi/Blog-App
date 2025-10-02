from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """API endpoint to list user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return only notifications for the current user"""
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('sender', 'content_type').order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
        notification.read = True
        notification.save()
        return Response({"status": "success"}, status=status.HTTP_200_OK)
    except Notification.DoesNotExist:
        return Response(
            {"error": "Notification not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the current user"""
    Notification.objects.filter(recipient=request.user, read=False).update(read=True)
    return Response({"status": "success"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notification_count(request):
    """Return count of unread notifications for the current user"""
    count = Notification.objects.filter(recipient=request.user, read=False).count()
    return Response({"count": count}, status=status.HTTP_200_OK)
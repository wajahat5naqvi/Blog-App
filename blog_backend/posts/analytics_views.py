from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from .models import Post, PostView
from .analytics import PostViewSerializer, PostViewAnalyticsSerializer, UserAnalyticsSerializer


class PostViewCreateView(generics.CreateAPIView):
    """API endpoint to record a post view"""
    serializer_class = PostViewSerializer
    permission_classes = [permissions.AllowAny]  # Allow anonymous views
    
    def create(self, request, *args, **kwargs):
        post_id = kwargs.get('post_id')
        post = get_object_or_404(Post, id=post_id)
        
        # Get client IP and user agent
        ip = self.request.META.get('REMOTE_ADDR', '')
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        # Create view record
        view_data = {
            'post': post.id,
            'ip_address': ip,
            'user_agent': user_agent,
        }
        
        # Add authenticated user if available
        if request.user.is_authenticated:
            view_data['user'] = request.user.id
        
        serializer = self.get_serializer(data=view_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Increment post view count
        post.increment_views()
        
        return Response({"status": "success"}, status=status.HTTP_201_CREATED)


class PostViewsStatsView(generics.ListAPIView):
    """API endpoint to get post view statistics"""
    serializer_class = PostViewAnalyticsSerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins can see stats
    
    def get_queryset(self):
        # Get parameters
        days = int(self.request.query_params.get('days', 30))
        post_id = self.request.query_params.get('post_id', None)
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Base queryset
        queryset = PostView.objects.filter(
            viewed_at__gte=start_date,
            viewed_at__lte=end_date
        )
        
        # Filter by post if specified
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        
        # Group by date and count views
        queryset = queryset.annotate(
            date=TruncDate('viewed_at')
        ).values('date').annotate(
            views_count=Count('id')
        ).order_by('date')
        
        return queryset


class UserActivityStatsView(generics.ListAPIView):
    """API endpoint to get user activity statistics"""
    serializer_class = UserAnalyticsSerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins can see stats
    
    def get_queryset(self):
        # Get parameters
        days = int(self.request.query_params.get('days', 30))
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Count unique users per day
        queryset = PostView.objects.filter(
            viewed_at__gte=start_date,
            viewed_at__lte=end_date,
            user__isnull=False  # Only count logged-in users
        ).annotate(
            date=TruncDate('viewed_at')
        ).values('date').annotate(
            active_users=Count('user', distinct=True)
        ).order_by('date')
        
        return queryset
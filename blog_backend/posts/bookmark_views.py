from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Bookmark, Post
from .bookmark_serializers import BookmarkSerializer


class BookmarkListView(generics.ListAPIView):
    """API endpoint to list user bookmarks"""
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return only bookmarks for the current user"""
        return Bookmark.objects.filter(
            user=self.request.user
        ).select_related('post', 'post__author').order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_bookmark(request, post_id):
    """Add a bookmark for a post"""
    post = get_object_or_404(Post, id=post_id)
    
    # Check if bookmark already exists
    bookmark, created = Bookmark.objects.get_or_create(
        user=request.user,
        post=post
    )
    
    if created:
        return Response(
            {"status": "success", "message": "Post bookmarked successfully"},
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        {"status": "info", "message": "Post was already bookmarked"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_bookmark(request, post_id):
    """Remove a bookmark for a post"""
    post = get_object_or_404(Post, id=post_id)
    
    try:
        bookmark = Bookmark.objects.get(user=request.user, post=post)
        bookmark.delete()
        return Response(
            {"status": "success", "message": "Bookmark removed successfully"},
            status=status.HTTP_200_OK
        )
    except Bookmark.DoesNotExist:
        return Response(
            {"status": "error", "message": "Bookmark not found"},
            status=status.HTTP_404_NOT_FOUND
        )
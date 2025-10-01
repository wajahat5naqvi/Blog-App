from rest_framework import viewsets, permissions, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Post, Comment, Like, Tag
from .serializers import (
    PostSerializer, PostCreateUpdateSerializer, CommentSerializer, 
    LikeSerializer, TagSerializer
)
from .permissions import IsAuthorOrReadOnly
from django.shortcuts import get_object_or_404
from django.db.models import Q

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing and retrieving tags"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class PostViewSet(viewsets.ModelViewSet):
    """ViewSet for CRUD operations on posts"""
    queryset = Post.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'tags__name', 'author__username']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        return PostSerializer
        
    def create(self, request, *args, **kwargs):
        """Override create method to ensure proper error responses and handle file upload errors better"""
        try:
            # Check for image file size before proceeding
            if 'featured_image' in request.FILES:
                image = request.FILES['featured_image']
                from django.conf import settings
                
                # Size validation
                max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * 1024 * 1024)  # Default 5MB
                if image.size > max_size:
                    return Response(
                        {"errors": {"featured_image": [f"Image file too large. Maximum size is {max_size / 1024 / 1024}MB."]}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Type validation
                allowed_types = getattr(settings, 'ALLOWED_IMAGE_TYPES', 
                                        ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
                if image.content_type not in allowed_types:
                    return Response(
                        {"errors": {"featured_image": ["Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image."]}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Use serializer to validate the data
            serializer = self.get_serializer(data=request.data)
            
            if serializer.is_valid():
                # If valid, save the post and return successful response
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            else:
                # If invalid, return structured error response
                return Response(
                    {"errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            # Log the exception for debugging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating post: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Check if this is a validation error from serializer
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                return Response(
                    {"errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Return a detailed error response
            return Response(
                {
                    "errors": {
                        "detail": ["An error occurred while processing your post. Please try again."],
                        "non_field_errors": ["Server encountered an error while processing your request."]
                    },
                    "error_type": str(type(e).__name__),
                    "error_message": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_queryset(self):
        queryset = Post.objects.all()
        
        # Filter by tag if provided
        tag = self.request.query_params.get('tag')
        if tag:
            queryset = queryset.filter(tags__name=tag)
        
        # Filter by author if provided
        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author__username=author)
            
        return queryset
    
    def update(self, request, *args, **kwargs):
        """Override update method to ensure proper error responses and handle file upload errors better"""
        try:
            # Check for image file size before proceeding
            if 'featured_image' in request.FILES:
                image = request.FILES['featured_image']
                from django.conf import settings
                
                # Size validation
                max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * 1024 * 1024)
                if image.size > max_size:
                    return Response(
                        {"errors": {"featured_image": [f"Image file too large. Maximum size is {max_size / 1024 / 1024}MB."]}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Type validation
                allowed_types = getattr(settings, 'ALLOWED_IMAGE_TYPES', 
                                       ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
                if image.content_type not in allowed_types:
                    return Response(
                        {"errors": {"featured_image": ["Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image."]}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get the instance
            instance = self.get_object()
            
            # Use serializer to validate the data
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            
            if serializer.is_valid():
                # If valid, save the post and return successful response
                self.perform_update(serializer)
                
                if getattr(instance, '_prefetched_objects_cache', None):
                    # If 'prefetch_related' has been applied to a queryset, we need to
                    # forcibly invalidate the prefetch cache on the instance.
                    instance._prefetched_objects_cache = {}
                    
                return Response(serializer.data)
            else:
                # If invalid, return structured error response
                return Response(
                    {"errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            # Log the exception
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating post: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Check if this is a validation error from serializer
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                return Response(
                    {"errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Return user-friendly error with structured response
            return Response(
                {
                    "errors": {
                        "detail": ["An error occurred while processing your post. Please try again."],
                        "non_field_errors": ["Server encountered an error while processing your request."]
                    },
                    "error_type": str(type(e).__name__),
                    "error_message": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        comments = Comment.objects.filter(post=post, parent=None)  # Only top-level comments
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(data={
            'post': post.id,
            'content': request.data.get('content'),
            'parent': request.data.get('parent')
        }, context={'request': request})
        
        if serializer.is_valid():
            serializer.save(author=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post', 'delete'])
    def like(self, request, pk=None):
        try:
            post = self.get_object()
            
            if request.method == 'POST':
                # Add like
                like, created = Like.objects.get_or_create(
                    user=request.user,
                    post=post
                )
                if created:
                    return Response({'status': 'post liked'}, status=status.HTTP_201_CREATED)
                return Response({'status': 'already liked'}, status=status.HTTP_200_OK)
                
            elif request.method == 'DELETE':
                # Remove like
                like = Like.objects.filter(user=request.user, post=post)
                if like.exists():
                    like.delete()
                    return Response({'status': 'like removed'}, status=status.HTTP_204_NO_CONTENT)
                return Response({'status': 'not liked'}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            # Log the exception
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error in post like/unlike: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return structured error response
            return Response(
                {
                    "errors": {
                        "detail": ["An error occurred processing the like operation."],
                        "non_field_errors": ["Server encountered an error while processing your request."]
                    },
                    "error_type": str(type(e).__name__),
                    "error_message": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for CRUD operations on comments"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    
    @action(detail=True, methods=['post', 'delete'])
    def like(self, request, pk=None):
        try:
            comment = self.get_object()
            
            if request.method == 'POST':
                # Add like
                like, created = Like.objects.get_or_create(
                    user=request.user,
                    comment=comment
                )
                if created:
                    return Response({'status': 'comment liked'}, status=status.HTTP_201_CREATED)
                return Response({'status': 'already liked'}, status=status.HTTP_200_OK)
                
            elif request.method == 'DELETE':
                # Remove like
                like = Like.objects.filter(user=request.user, comment=comment)
                if like.exists():
                    like.delete()
                    return Response({'status': 'like removed'}, status=status.HTTP_204_NO_CONTENT)
                return Response({'status': 'not liked'}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            # Log the exception
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error in comment like/unlike: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return structured error response
            return Response(
                {
                    "errors": {
                        "detail": ["An error occurred processing the comment like operation."],
                        "non_field_errors": ["Server encountered an error while processing your request."]
                    },
                    "error_type": str(type(e).__name__),
                    "error_message": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

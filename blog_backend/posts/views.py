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
    print("TEST")
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

class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for CRUD operations on comments"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    
    @action(detail=True, methods=['post', 'delete'])
    def like(self, request, pk=None):
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

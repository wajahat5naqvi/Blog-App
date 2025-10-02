from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from .models import Post, Comment, Like, Tag, Category, Bookmark
from .serializers_new import (
    PostListSerializer, PostDetailSerializer, PostCreateUpdateSerializer,
    CommentSerializer, CommentCreateSerializer, LikeSerializer,
    TagSerializer, CategorySerializer, BookmarkSerializer
)
from .permissions import IsAuthorOrReadOnly, IsAdminUserOrReadOnly


class StandardResultsPagination(PageNumberPagination):
    """Standard pagination for all list views"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for categories.
    Admin can create/update/delete, others can only view
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUserOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """List all posts in a specific category"""
        category = self.get_object()
        posts = Post.objects.filter(category=category, published=True)
        
        # Apply pagination
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = PostListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    """
    API endpoint for tags.
    Admin can create/update/delete, others can only view
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminUserOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """List all posts with a specific tag"""
        tag = self.get_object()
        posts = Post.objects.filter(tags=tag, published=True)
        
        # Apply pagination
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = PostListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class PostViewSet(viewsets.ModelViewSet):
    """
    API endpoint for posts.
    Supports full CRUD operations with appropriate permissions.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'excerpt', 'tags__name', 'author__username']
    ordering_fields = ['created_at', 'updated_at', 'title', 'views_count']
    ordering = ['-created_at']
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = Post.objects.all()
        
        # By default, only show published posts to non-authors
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(published=True)
        elif not self.request.user.is_staff:
            # Regular users can see published posts and their own unpublished posts
            queryset = queryset.filter(
                Q(published=True) | Q(author=self.request.user)
            )
        
        # Filter by tag if provided
        tag = self.request.query_params.get('tag')
        if tag:
            queryset = queryset.filter(tags__name=tag)
        
        # Filter by category if provided
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by author if provided
        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author__username=author)
        
        return queryset
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        elif self.action == 'list':
            return PostListSerializer
        return PostDetailSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Override to increment view count on retrieving post details"""
        instance = self.get_object()
        
        # Increment view count if this isn't the author
        if request.user != instance.author:
            instance.increment_views()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all top-level comments for a post"""
        post = self.get_object()
        comments = Comment.objects.filter(post=post, parent=None, is_approved=True)
        
        # Apply pagination
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = CommentSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike a post"""
        post = self.get_object()
        user = request.user
        
        # Check if user already liked the post
        like_exists = Like.objects.filter(user=user, post=post).exists()
        
        if like_exists:
            # Unlike: remove the like
            Like.objects.filter(user=user, post=post).delete()
            return Response({'detail': 'Post unliked successfully'}, status=status.HTTP_200_OK)
        else:
            # Like: create new like
            Like.objects.create(user=user, post=post)
            return Response({'detail': 'Post liked successfully'}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bookmark(self, request, pk=None):
        """Bookmark or remove bookmark for a post"""
        post = self.get_object()
        user = request.user
        
        # Check if user already bookmarked the post
        bookmark_exists = Bookmark.objects.filter(user=user, post=post).exists()
        
        if bookmark_exists:
            # Remove bookmark
            Bookmark.objects.filter(user=user, post=post).delete()
            return Response({'detail': 'Bookmark removed successfully'}, status=status.HTTP_200_OK)
        else:
            # Add bookmark
            Bookmark.objects.create(user=user, post=post)
            return Response({'detail': 'Post bookmarked successfully'}, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def bookmarked(self, request):
        """Get all posts bookmarked by the current user"""
        bookmarks = Bookmark.objects.filter(user=request.user).values_list('post', flat=True)
        posts = Post.objects.filter(id__in=bookmarks, published=True)
        
        # Apply pagination
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = PostListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular posts based on view count"""
        posts = Post.objects.filter(published=True).order_by('-views_count')[:10]
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments.
    Supports full CRUD operations with appropriate permissions.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['created_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions"""
        if self.request.user.is_staff:
            # Admin can see all comments including unapproved ones
            return Comment.objects.all()
        elif self.request.user.is_authenticated:
            # Authenticated users can see approved comments and their own unapproved ones
            return Comment.objects.filter(
                Q(is_approved=True) | Q(author=self.request.user)
            )
        else:
            # Unauthenticated users can only see approved comments
            return Comment.objects.filter(is_approved=True)
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return CommentCreateSerializer
        return CommentSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike a comment"""
        comment = self.get_object()
        user = request.user
        
        # Check if user already liked the comment
        like_exists = Like.objects.filter(user=user, comment=comment).exists()
        
        if like_exists:
            # Unlike: remove the like
            Like.objects.filter(user=user, comment=comment).delete()
            return Response({'detail': 'Comment unliked successfully'}, status=status.HTTP_200_OK)
        else:
            # Like: create new like
            Like.objects.create(user=user, comment=comment)
            return Response({'detail': 'Comment liked successfully'}, status=status.HTTP_201_CREATED)


class BookmarkViewSet(viewsets.ModelViewSet):
    """
    API endpoint for bookmarks.
    Users can only access their own bookmarks.
    """
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own bookmarks"""
        return Bookmark.objects.filter(user=self.request.user)


class UserPostsView(APIView):
    """View for getting posts by a specific user"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsPagination
    
    def get(self, request, username):
        """Get all published posts by the specified user"""
        if request.user.is_authenticated and request.user.username == username:
            # User can see all their own posts including unpublished
            posts = Post.objects.filter(author__username=username)
        else:
            # Others can only see published posts
            posts = Post.objects.filter(author__username=username, published=True)
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(posts, request)
        
        if page is not None:
            serializer = PostListSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
            
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class UserBookmarksView(APIView):
    """View for getting bookmarks for the current user"""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get(self, request):
        """Get all bookmarks for the current user"""
        bookmarks = Bookmark.objects.filter(user=request.user)
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(bookmarks, request)
        
        if page is not None:
            serializer = BookmarkSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
            
        serializer = BookmarkSerializer(bookmarks, many=True, context={'request': request})
        return Response(serializer.data)
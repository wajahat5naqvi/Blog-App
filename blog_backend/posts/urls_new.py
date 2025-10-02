from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_new import (
    PostViewSet, CommentViewSet, TagViewSet, CategoryViewSet, 
    BookmarkViewSet, UserPostsView, UserBookmarksView
)

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'bookmarks', BookmarkViewSet, basename='bookmark')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Custom URLs for non-ViewSet views
    path('users/<str:username>/posts/', UserPostsView.as_view(), name='user-posts'),
    path('users/me/bookmarks/', UserBookmarksView.as_view(), name='user-bookmarks'),
]
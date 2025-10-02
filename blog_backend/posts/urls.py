from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet, TagViewSet
from .bookmark_views import BookmarkListView, add_bookmark, remove_bookmark
from .analytics_views import PostViewCreateView, PostViewsStatsView, UserActivityStatsView
from .category_views import CategoryViewSet

router = DefaultRouter()
router.register(r'posts', PostViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'tags', TagViewSet)
router.register(r'categories', CategoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Bookmarks
    path('bookmarks/', BookmarkListView.as_view(), name='bookmark-list'),
    path('posts/<int:post_id>/bookmark/', add_bookmark, name='add-bookmark'),
    path('posts/<int:post_id>/unbookmark/', remove_bookmark, name='remove-bookmark'),
    
    # Analytics
    path('posts/<int:post_id>/view/', PostViewCreateView.as_view(), name='post-view'),
    path('analytics/posts/', PostViewsStatsView.as_view(), name='post-analytics'),
    path('analytics/users/', UserActivityStatsView.as_view(), name='user-analytics'),
]
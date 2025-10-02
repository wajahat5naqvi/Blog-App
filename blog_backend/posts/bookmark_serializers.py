from rest_framework import serializers
from .models import Bookmark, Post


class BookmarkSerializer(serializers.ModelSerializer):
    """Serializer for bookmarks"""
    post_title = serializers.CharField(source='post.title', read_only=True)
    post_slug = serializers.CharField(source='post.slug', read_only=True)
    post_excerpt = serializers.CharField(source='post.excerpt', read_only=True)
    post_featured_image = serializers.ImageField(source='post.featured_image', read_only=True)
    author_username = serializers.CharField(source='post.author.username', read_only=True)
    
    class Meta:
        model = Bookmark
        fields = [
            'id', 'post', 'created_at', 'post_title', 'post_slug', 
            'post_excerpt', 'post_featured_image', 'author_username'
        ]
        read_only_fields = ['created_at', 'id']
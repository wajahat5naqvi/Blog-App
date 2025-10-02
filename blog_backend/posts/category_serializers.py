from rest_framework import serializers
from .models import Category

class CategorySerializer(serializers.ModelSerializer):
    """Serializer for blog post categories"""
    post_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'post_count']
        read_only_fields = ['slug', 'post_count']
    
    def get_post_count(self, obj):
        """Get the number of posts in this category"""
        return obj.posts.count() if hasattr(obj, 'posts') else 0
from rest_framework import serializers
from .models import Post, Comment, Like, Tag
from accounts.serializers import UserSerializer

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'parent', 'created_at', 'replies', 'likes_count', 'is_liked']
        read_only_fields = ['id', 'author', 'created_at', 'replies', 'likes_count', 'is_liked']
    
    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []
    
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, required=False)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'title', 'content', 'featured_image',
            'tags', 'created_at', 'updated_at', 'slug', 'comments',
            'likes_count', 'is_liked'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'slug', 'comments', 'likes_count', 'is_liked']
    
    def get_comments(self, obj):
        # Only return top-level comments (no parent)
        top_comments = obj.comments.filter(parent=None)
        return CommentSerializer(top_comments, many=True, context=self.context).data
    
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def create(self, validated_data):
        # Pop tags data if present
        tags_data = validated_data.pop('tags', [])
        
        # Create post
        validated_data['author'] = self.context['request'].user
        post = Post.objects.create(**validated_data)
        
        # Add tags to post
        if tags_data:
            for tag_data in tags_data:
                tag, _ = Tag.objects.get_or_create(name=tag_data['name'])
                post.tags.add(tag)
        
        return post
    
    def update(self, instance, validated_data):
        # Update tags if provided
        if 'tags' in validated_data:
            tags_data = validated_data.pop('tags')
            instance.tags.clear()
            for tag_data in tags_data:
                tag, _ = Tag.objects.get_or_create(name=tag_data['name'])
                instance.tags.add(tag)
        
        return super().update(instance, validated_data)

class PostCreateUpdateSerializer(PostSerializer):
    """Serializer for creating and updating posts with simple tag handling"""
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        post = Post.objects.create(author=self.context['request'].user, **validated_data)
        
        # Add tags
        for tag_name in tags:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            post.tags.add(tag)
        
        return post
    
    def update(self, instance, validated_data):
        if 'tags' in validated_data:
            tags = validated_data.pop('tags')
            instance.tags.clear()
            for tag_name in tags:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                instance.tags.add(tag)
                
        return super().update(instance, validated_data)

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
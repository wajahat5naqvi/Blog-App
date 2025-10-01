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
    
    def validate_featured_image(self, value):
        """
        Validate the featured_image field:
        - Check file size
        - Verify file format is allowed
        - Sanitize filename
        """
        if not value:
            return value
            
        # Check file size (5MB max)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image size too large. Maximum file size is {max_size / 1024 / 1024}MB."
            )
            
        # Check file format
        allowed_formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if not hasattr(value, 'content_type') or value.content_type not in allowed_formats:
            raise serializers.ValidationError(
                f"Unsupported image format. Allowed formats are: jpg, jpeg, png, webp, and gif."
            )
            
        return value
    
    def create(self, validated_data):
        try:
            # Pop tags data if present
            tags = validated_data.pop('tags', [])
            
            # Create post with the user from the request context
            post = Post.objects.create(author=self.context['request'].user, **validated_data)
            
            # Add tags to post - making this process more robust
            if tags:
                for tag_name in tags:
                    if tag_name and isinstance(tag_name, str):
                        # Strip whitespace and ensure tag is not empty
                        tag_name = tag_name.strip()
                        if tag_name:
                            tag, _ = Tag.objects.get_or_create(name=tag_name)
                            post.tags.add(tag)
            
            return post
            
        except Exception as e:
            # Log the actual error for debugging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating post: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Determine error type for more specific error messages
            if 'featured_image' in str(e).lower():
                raise serializers.ValidationError({
                    "featured_image": [f"Error processing image: {str(e)}"],
                    "detail": ["Failed to create post. There was an error processing your image."]
                })
            elif 'tag' in str(e).lower():
                raise serializers.ValidationError({
                    "tags": [f"Error processing tags: {str(e)}"],
                    "detail": ["Failed to create post. There was an error processing your tags."]
                })
            else:
                # Re-raise with a more user-friendly and detailed message
                raise serializers.ValidationError({
                    "detail": ["Failed to create post. Please check your submission and try again."],
                    "error_type": str(type(e).__name__),
                    "error_details": str(e)
                })
    
    def update(self, instance, validated_data):
        try:
            if 'tags' in validated_data:
                tags = validated_data.pop('tags')
                instance.tags.clear()
                for tag_name in tags:
                    tag, _ = Tag.objects.get_or_create(name=tag_name)
                    instance.tags.add(tag)
                    
            return super().update(instance, validated_data)
        except Exception as e:
            # Log the actual error for debugging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating post: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Determine error type for more specific error messages
            if 'featured_image' in str(e).lower():
                raise serializers.ValidationError({
                    "featured_image": [f"Error processing image: {str(e)}"],
                    "detail": ["Failed to update post. There was an error processing your image."]
                })
            elif 'tag' in str(e).lower():
                raise serializers.ValidationError({
                    "tags": [f"Error processing tags: {str(e)}"],
                    "detail": ["Failed to update post. There was an error processing your tags."]
                })
            else:
                # Re-raise with a more user-friendly and detailed message
                raise serializers.ValidationError({
                    "detail": ["Failed to update post. Please check your submission and try again."],
                    "error_type": str(type(e).__name__),
                    "error_details": str(e)
                })

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
from rest_framework import serializers
from .models import Post, Comment, Like, Tag, Bookmark
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
    is_bookmarked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'title', 'content', 'featured_image',
            'tags', 'created_at', 'updated_at', 'slug', 'comments',
            'likes_count', 'is_liked', 'is_bookmarked'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'slug', 'comments', 'likes_count', 'is_liked', 'is_bookmarked']
    
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
        
    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(post=obj, user=request.user).exists()
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

class PostCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating posts with simple tag handling"""
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True
    )
    comments_count = serializers.SerializerMethodField(read_only=True)
    likes_count = serializers.SerializerMethodField(read_only=True)
    is_liked = serializers.SerializerMethodField(read_only=True)
    is_bookmarked = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'title', 'content', 'featured_image',
            'tags', 'created_at', 'updated_at', 'slug', 
            'comments_count', 'likes_count', 'is_liked', 'is_bookmarked'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'slug']
    
    def get_comments_count(self, obj):
        return obj.comments.count()
        
    def get_likes_count(self, obj):
        return obj.likes.count()
        
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
        
    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(post=obj, user=request.user).exists()
        return False
    
    def to_representation(self, instance):
        """
        Override to represent tags as a list of objects with id and name
        """
        # First get the standard representation
        ret = super().to_representation(instance)
        
        # Replace tags with proper objects including both id and name
        if hasattr(instance, 'tags') and instance.tags.exists():
            ret['tags'] = [{'id': tag.id, 'name': tag.name} for tag in instance.tags.all()]
        else:
            ret['tags'] = []
            
        return ret
    
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
            tags_data = validated_data.pop('tags', [])
            
            # Create post with the user from the request context
            post = Post.objects.create(author=self.context['request'].user, **validated_data)
            
            # Process tags - handle both tag names and tag IDs
            if tags_data:
                # Clear existing tags first
                post.tags.clear()
                
                for tag_item in tags_data:
                    # Try to handle both string tags and objects
                    if isinstance(tag_item, str):
                        # This is a tag name - create or get the tag
                        tag_name = tag_item.strip()
                        if tag_name:  # Only process non-empty tags
                            tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                            post.tags.add(tag_obj)
                    elif isinstance(tag_item, dict) and 'name' in tag_item:
                        # This is a dictionary with a name field
                        tag_name = tag_item['name'].strip()
                        if tag_name:
                            tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                            post.tags.add(tag_obj)
                    elif isinstance(tag_item, int) or (isinstance(tag_item, str) and tag_item.isdigit()):
                        # This is a tag ID
                        try:
                            tag_id = int(tag_item)
                            if Tag.objects.filter(id=tag_id).exists():
                                post.tags.add(tag_id)
                        except (ValueError, TypeError):
                            pass
            
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
            # Handle tags separately
            if 'tags' in validated_data:
                tags_data = validated_data.pop('tags')
                
                # Clear existing tags first
                instance.tags.clear()
                
                # Process tags - handle both tag names and tag IDs
                for tag_item in tags_data:
                    # Try to handle both string tags and objects
                    if isinstance(tag_item, str):
                        # This is a tag name - create or get the tag
                        tag_name = tag_item.strip()
                        if tag_name:  # Only process non-empty tags
                            tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                            instance.tags.add(tag_obj)
                    elif isinstance(tag_item, dict) and 'name' in tag_item:
                        # This is a dictionary with a name field
                        tag_name = tag_item['name'].strip()
                        if tag_name:
                            tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                            instance.tags.add(tag_obj)
                    elif isinstance(tag_item, int) or (isinstance(tag_item, str) and tag_item.isdigit()):
                        # This is a tag ID
                        try:
                            tag_id = int(tag_item)
                            if Tag.objects.filter(id=tag_id).exists():
                                instance.tags.add(tag_id)
                        except (ValueError, TypeError):
                            pass
            
            # Update the instance fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            return instance
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
        
# Simple BookmarkSerializer used internally
class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bookmark
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
from rest_framework import serializers
from .models import Post, Tag, Category, Comment, Like, Bookmark
from accounts.serializers import UserSerializer

class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id', 'slug']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    posts_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'posts_count']
        read_only_fields = ['id', 'slug', 'posts_count']
    
    def get_posts_count(self, obj):
        return obj.posts.count()


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model"""
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'parent', 
                  'created_at', 'updated_at', 'is_approved',
                  'replies', 'likes_count', 'is_liked']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 
                           'replies', 'likes_count', 'is_liked']
    
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
        # Associate with authenticated user
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CommentCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for comment creation"""
    class Meta:
        model = Comment
        fields = ['id', 'post', 'content', 'parent']
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        
        # Validate parent comment is from the same post
        parent = validated_data.get('parent')
        post = validated_data.get('post')
        
        if parent and parent.post.id != post.id:
            raise serializers.ValidationError({
                'parent': ['Parent comment must belong to the same post.']
            })
        
        return super().create(validated_data)


class PostListSerializer(serializers.ModelSerializer):
    """Serializer for listing posts with minimal details"""
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'slug', 'author', 'excerpt', 'featured_image',
            'category', 'tags', 'created_at', 'updated_at', 'published',
            'comments_count', 'likes_count', 'views_count', 'is_liked', 'is_bookmarked'
        ]
        read_only_fields = fields
    
    def get_comments_count(self, obj):
        return obj.comments.filter(is_approved=True).count()
    
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
            return obj.bookmarks.filter(user=request.user).exists()
        return False


class PostDetailSerializer(serializers.ModelSerializer):
    """Serializer for post details with complete information"""
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'slug', 'author', 'content', 'excerpt',
            'featured_image', 'category', 'tags', 'created_at', 
            'updated_at', 'published', 'views_count',
            'comments', 'likes_count', 'is_liked', 'is_bookmarked'
        ]
        read_only_fields = fields
    
    def get_comments(self, obj):
        # Only return top-level comments (no parent) that are approved
        top_comments = obj.comments.filter(parent=None, is_approved=True)
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
            return obj.bookmarks.filter(user=request.user).exists()
        return False


class PostCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating posts with flexible tag handling"""
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True
    )
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 'excerpt', 'featured_image',
            'category_id', 'tags', 'published'
        ]
        read_only_fields = ['id']
    
    def validate_featured_image(self, value):
        """Validate the featured_image field"""
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
    
    def validate_category_id(self, value):
        """Validate category exists"""
        if value is not None:
            if not Category.objects.filter(id=value).exists():
                raise serializers.ValidationError("Category not found")
        return value
    
    def to_representation(self, instance):
        """Override to use PostDetailSerializer for representation"""
        return PostDetailSerializer(instance, context=self.context).data
    
    def create(self, validated_data):
        try:
            # Extract category and tags data
            tags_data = validated_data.pop('tags', [])
            category_id = validated_data.pop('category_id', None)
            
            # Create post with the user from the request context
            post = Post(
                author=self.context['request'].user,
                **validated_data
            )
            
            # Set category if provided
            if category_id:
                post.category_id = category_id
                
            post.save()
            
            # Process tags
            self._process_tags(post, tags_data)
            
            return post
            
        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating post: {str(e)}")
            
            # Provide friendly error message based on error type
            if 'featured_image' in str(e).lower():
                raise serializers.ValidationError({
                    "featured_image": [f"Error processing image: {str(e)}"]
                })
            elif 'tag' in str(e).lower():
                raise serializers.ValidationError({
                    "tags": [f"Error processing tags: {str(e)}"]
                })
            else:
                raise serializers.ValidationError({
                    "detail": [f"Failed to create post: {str(e)}"]
                })
    
    def update(self, instance, validated_data):
        try:
            # Extract category and tags data
            tags_data = validated_data.pop('tags', None)
            category_id = validated_data.pop('category_id', None)
            
            # Update category if provided
            if category_id is not None:
                instance.category_id = category_id
            
            # Update all other fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
                
            instance.save()
            
            # Process tags if provided
            if tags_data is not None:
                self._process_tags(instance, tags_data)
            
            return instance
            
        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating post: {str(e)}")
            
            # Provide friendly error message based on error type
            if 'featured_image' in str(e).lower():
                raise serializers.ValidationError({
                    "featured_image": [f"Error processing image: {str(e)}"]
                })
            elif 'tag' in str(e).lower():
                raise serializers.ValidationError({
                    "tags": [f"Error processing tags: {str(e)}"]
                })
            else:
                raise serializers.ValidationError({
                    "detail": [f"Failed to update post: {str(e)}"]
                })
    
    def _process_tags(self, post, tags_data):
        """Helper method to process tags data"""
        if tags_data is not None:
            # Clear existing tags first
            post.tags.clear()
            
            # Process each tag
            for tag_item in tags_data:
                if isinstance(tag_item, str):
                    # Handle string tag names
                    tag_name = tag_item.strip()
                    if tag_name:
                        tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                        post.tags.add(tag_obj)
                elif isinstance(tag_item, dict) and 'name' in tag_item:
                    # Handle dictionary with name field
                    tag_name = tag_item['name'].strip()
                    if tag_name:
                        tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                        post.tags.add(tag_obj)
                elif isinstance(tag_item, int) or (isinstance(tag_item, str) and tag_item.isdigit()):
                    # Handle numeric tag IDs
                    try:
                        tag_id = int(tag_item)
                        if Tag.objects.filter(id=tag_id).exists():
                            post.tags.add(tag_id)
                    except (ValueError, TypeError):
                        pass


class LikeSerializer(serializers.ModelSerializer):
    """Serializer for Like model"""
    class Meta:
        model = Like
        fields = ['id', 'post', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate(self, attrs):
        """Ensure either post or comment is provided, but not both"""
        post = attrs.get('post')
        comment = attrs.get('comment')
        
        if (post and comment) or (not post and not comment):
            raise serializers.ValidationError({
                'detail': ['A like must be associated with either a post or a comment, but not both.']
            })
            
        return attrs
    
    def create(self, validated_data):
        user = self.context['request'].user
        post = validated_data.get('post')
        comment = validated_data.get('comment')
        
        # Check if already liked
        if post and Like.objects.filter(user=user, post=post).exists():
            raise serializers.ValidationError({
                'detail': ['You have already liked this post.']
            })
            
        if comment and Like.objects.filter(user=user, comment=comment).exists():
            raise serializers.ValidationError({
                'detail': ['You have already liked this comment.']
            })
        
        # Create like
        like = Like(user=user, **validated_data)
        like.save()
        return like


class BookmarkSerializer(serializers.ModelSerializer):
    """Serializer for Bookmark model"""
    post_title = serializers.CharField(source='post.title', read_only=True)
    
    class Meta:
        model = Bookmark
        fields = ['id', 'post', 'post_title', 'created_at']
        read_only_fields = ['id', 'created_at', 'post_title']
    
    def create(self, validated_data):
        user = self.context['request'].user
        post = validated_data.get('post')
        
        # Check if already bookmarked
        if Bookmark.objects.filter(user=user, post=post).exists():
            raise serializers.ValidationError({
                'detail': ['You have already bookmarked this post.']
            })
        
        # Create bookmark
        bookmark = Bookmark(user=user, **validated_data)
        bookmark.save()
        return bookmark
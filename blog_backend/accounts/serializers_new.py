from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from .models_new import Profile, Follow, Notification

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Basic serializer for User model with minimal information"""
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']
        read_only_fields = ['id']
    
    def get_profile_picture(self, obj):
        """Get URL for profile picture or None if not available"""
        try:
            if obj.profile and obj.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.profile_picture.url)
                return obj.profile.profile_picture.url
        except (Profile.DoesNotExist, AttributeError):
            pass
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with profile information"""
    profile_picture = serializers.SerializerMethodField()
    bio = serializers.CharField(source='profile.bio', read_only=True)
    location = serializers.CharField(source='profile.location', read_only=True)
    website = serializers.URLField(source='profile.website', read_only=True)
    twitter = serializers.CharField(source='profile.twitter', read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'profile_picture', 'bio', 'location', 
            'website', 'twitter', 'followers_count', 'following_count', 
            'posts_count', 'date_joined', 'is_following'
        ]
        read_only_fields = fields
    
    def get_profile_picture(self, obj):
        """Get URL for profile picture or None if not available"""
        try:
            if obj.profile and obj.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.profile_picture.url)
                return obj.profile.profile_picture.url
        except (Profile.DoesNotExist, AttributeError):
            pass
        return None
    
    def get_followers_count(self, obj):
        """Get count of followers for this user"""
        return obj.followers.count()
    
    def get_following_count(self, obj):
        """Get count of users this user is following"""
        return obj.following.count()
    
    def get_posts_count(self, obj):
        """Get count of posts by this user"""
        return obj.posts.count()
    
    def get_is_following(self, obj):
        """Check if the requesting user follows this user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj:  # Can't follow yourself
                return False
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration with password validation"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": _("Password fields didn't match.")})
        
        # Additional username validation
        username = attrs.get('username')
        if len(username) < 3:
            raise serializers.ValidationError({"username": _("Username must be at least 3 characters long.")})
        
        # Check for special characters in username
        import re
        if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
            raise serializers.ValidationError({
                "username": _("Username can only contain letters, numbers, and the characters . _ -")
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Create a new user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        return user


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile update"""
    email = serializers.EmailField(source='user.email', required=False)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Profile
        fields = [
            'username', 'email', 'bio', 'profile_picture', 
            'website', 'location', 'twitter', 'instagram', 
            'linkedin', 'github', 'show_email', 'show_location'
        ]
    
    def validate_profile_picture(self, value):
        """Validate the profile_picture field"""
        if not value:
            return value
            
        # Check file size (2MB max)
        max_size = 2 * 1024 * 1024  # 2MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                _("Image size too large. Maximum file size is 2MB.")
            )
            
        # Check file format
        allowed_formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if not hasattr(value, 'content_type') or value.content_type not in allowed_formats:
            raise serializers.ValidationError(
                _("Unsupported image format. Allowed formats are: jpg, jpeg, png, and webp.")
            )
            
        return value
    
    def update(self, instance, validated_data):
        """Update profile and user email if provided"""
        # Handle nested user data (email update)
        user_data = validated_data.pop('user', None)
        if user_data and 'email' in user_data:
            user = instance.user
            user.email = user_data['email']
            user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": _("Password fields didn't match.")})
        return attrs


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for follow/unfollow operations"""
    username = serializers.CharField(source='following.username', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = Follow
        fields = ['id', 'following', 'username', 'profile_picture', 'created_at']
        read_only_fields = ['id', 'username', 'profile_picture', 'created_at']
    
    def get_profile_picture(self, obj):
        try:
            if obj.following.profile and obj.following.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.following.profile.profile_picture.url)
                return obj.following.profile.profile_picture.url
        except (Profile.DoesNotExist, AttributeError):
            pass
        return None
    
    def validate_following(self, value):
        user = self.context['request'].user
        
        # Can't follow yourself
        if user == value:
            raise serializers.ValidationError(_("You cannot follow yourself."))
        
        # Check if already following
        if self.context['request'].method == 'POST':
            if Follow.objects.filter(follower=user, following=value).exists():
                raise serializers.ValidationError(_("You are already following this user."))
        
        return value
    
    def create(self, validated_data):
        validated_data['follower'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications"""
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_profile_picture = serializers.SerializerMethodField()
    post_title = serializers.SerializerMethodField()
    post_slug = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'sender_username', 'sender_profile_picture',
            'post_title', 'post_slug', 'read', 'created_at'
        ]
        read_only_fields = fields
    
    def get_sender_profile_picture(self, obj):
        try:
            if obj.sender.profile and obj.sender.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                return obj.sender.profile.profile_picture.url
        except (Profile.DoesNotExist, AttributeError):
            pass
        return None
    
    def get_post_title(self, obj):
        if obj.post:
            return obj.post.title
        return None
    
    def get_post_slug(self, obj):
        if obj.post:
            return obj.post.slug
        return None
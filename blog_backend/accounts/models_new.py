from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model extending AbstractUser"""
    email = models.EmailField(_('email address'), unique=True)
    is_verified = models.BooleanField(_('email verified'), default=False)
    
    USERNAME_FIELD = 'username'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['email']
    
    def __str__(self):
        return self.username


class Profile(models.Model):
    """User profile model with additional user information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(_('biography'), blank=True)
    profile_picture = models.ImageField(_('profile picture'), upload_to='profile_pics/', blank=True, null=True)
    website = models.URLField(_('website'), blank=True)
    location = models.CharField(_('location'), max_length=100, blank=True)
    birth_date = models.DateField(_('birth date'), null=True, blank=True)
    
    # Social media links
    twitter = models.CharField(_('twitter username'), max_length=50, blank=True)
    instagram = models.CharField(_('instagram username'), max_length=50, blank=True)
    linkedin = models.CharField(_('linkedin username'), max_length=50, blank=True)
    github = models.CharField(_('github username'), max_length=50, blank=True)
    
    # Privacy settings
    show_email = models.BooleanField(_('show email'), default=False)
    show_location = models.BooleanField(_('show location'), default=True)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"


class Follow(models.Model):
    """Model to track follower relationships between users"""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('follower', 'following')
        # Prevent users from following themselves
        constraints = [
            models.CheckConstraint(
                check=~models.Q(follower=models.F('following')),
                name='prevent_self_follow'
            )
        ]
        
    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class Notification(models.Model):
    """Model for user notifications"""
    NOTIFICATION_TYPES = (
        ('follow', 'New Follower'),
        ('comment', 'New Comment'),
        ('reply', 'New Reply'),
        ('like_post', 'Post Like'),
        ('like_comment', 'Comment Like'),
    )
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey('posts.Post', on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey('posts.Comment', on_delete=models.CASCADE, null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.sender.username} {self.get_notification_type_display().lower()} to {self.recipient.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a Profile instance when a new User is created"""
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save the Profile instance when the User is saved"""
    try:
        instance.profile.save()
    except Profile.DoesNotExist:
        Profile.objects.create(user=instance)
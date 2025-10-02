from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.urls import reverse
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    """Category for blog posts"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Tag(models.Model):
    """Model for post tags"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, blank=True, null=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            self.slug = base_slug
            
            # Check if this slug already exists and make it unique if needed
            counter = 1
            
            # Keep checking until we find a unique slug
            while Tag.objects.filter(slug=self.slug).exists():
                # Create a new slug with a counter appended
                self.slug = f"{base_slug}-{counter}"
                counter += 1
                
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Post(models.Model):
    """
    Blog post model with automatic unique slug generation.
    Includes relationships to author, category, and tags.
    """
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    excerpt = models.TextField(blank=True, help_text="Short summary of the post")
    
    # Foreign Keys
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name='posts',
        null=True,
        blank=True
    )
    
    # Many-to-Many relationships
    tags = models.ManyToManyField(
        Tag,
        related_name='posts',
        blank=True
    )
    
    # Media
    featured_image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=True)
    is_draft = models.BooleanField(default=False, help_text="Whether this post is a draft")
    publish_at = models.DateTimeField(null=True, blank=True, help_text="Schedule post to publish at this time")
    views_count = models.PositiveIntegerField(default=0, editable=False)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
    
    def save(self, *args, **kwargs):
        """
        Override the save method to:
        1. Generate a unique slug based on the title
        2. Create an excerpt from the content if not provided
        """
        # Generate slug from title if not provided
        if not self.slug:
            # Create base slug from title
            base_slug = slugify(self.title)
            self.slug = base_slug
            
            # Check if slug exists and make it unique if needed
            counter = 1
            while Post.objects.filter(slug=self.slug).exists():
                # Append counter to make slug unique
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        
        # Generate excerpt from content if not provided
        if not self.excerpt and self.content:
            # Take first 150 characters of content as excerpt
            self.excerpt = self.content[:150] + "..." if len(self.content) > 150 else self.content
            
        # Call the original save method
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title
    
    def get_absolute_url(self):
        return reverse('post-detail', kwargs={'slug': self.slug})
    
    def get_absolute_url(self):
        return reverse('post-detail', kwargs={'slug': self.slug})
    
    def increment_views(self):
        """Increment the post view count"""
        self.views_count += 1
        self.save(update_fields=['views_count'])


class Comment(models.Model):
    """Model for post comments with threaded replies support"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_approved = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"
    
    def clean(self):
        """Ensure comments are properly structured"""
        # Prevent deeply nested comments (limit to 1 level)
        if self.parent and self.parent.parent:
            raise ValidationError(_('Comments can only be nested one level deep.'))
            

class Like(models.Model):
    """Model for likes on posts and comments"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes', null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='likes', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only like a post or comment once
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                condition=models.Q(post__isnull=False),
                name='unique_post_like'
            ),
            models.UniqueConstraint(
                fields=['user', 'comment'],
                condition=models.Q(comment__isnull=False),
                name='unique_comment_like'
            ),
        ]
        # Ensure either post or comment is provided, but not both or neither
        constraints.append(
            models.CheckConstraint(
                check=(
                    models.Q(post__isnull=False, comment__isnull=True) |
                    models.Q(post__isnull=True, comment__isnull=False)
                ),
                name='like_either_post_or_comment'
            )
        )
    
    def clean(self):
        """Ensure either post or comment is provided, but not both or neither"""
        if (self.post and self.comment) or (not self.post and not self.comment):
            raise ValidationError(_('A like must be associated with either a post or a comment, but not both.'))
    
    def __str__(self):
        if self.post:
            return f"{self.user.username} likes post: {self.post.title}"
        return f"{self.user.username} likes comment: {self.comment.content[:30]}"


class Bookmark(models.Model):
    """Model for user bookmarks of posts"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only bookmark a post once
        constraints = [
            models.UniqueConstraint(fields=['user', 'post'], name='unique_bookmark')
        ]
    
    def __str__(self):
        return f"{self.user.username} bookmarked {self.post.title}"


class PostView(models.Model):
    """Model to track post views for analytics"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='post_views',
        null=True,  # Allow anonymous views
        blank=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Add index to improve query performance for analytics
        indexes = [
            models.Index(fields=['viewed_at']),
            models.Index(fields=['post']),
        ]
        
    def __str__(self):
        if self.user:
            return f"{self.post.title} viewed by {self.user.username} on {self.viewed_at}"
        return f"{self.post.title} viewed anonymously on {self.viewed_at}"

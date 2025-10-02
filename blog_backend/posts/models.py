from django.db import models
from django.conf import settings
from django.utils.text import slugify

class Tag(models.Model):
    """Model for post tags"""
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

class Post(models.Model):
    """Blog post model with automatic unique slug generation"""
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200)
    content = models.TextField()
    featured_image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    tags = models.ManyToManyField(Tag, related_name='posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        """
        Override the save method to generate a unique slug based on the title.
        If a slug with the same name exists, append a number to make it unique.
        """
        if not self.slug:
            # Generate the initial slug from title
            base_slug = slugify(self.title)
            self.slug = base_slug
            
            # Check if this slug already exists and make it unique if needed
            counter = 1
            
            # Keep checking until we find a unique slug
            while Post.objects.filter(slug=self.slug).exists():
                # Create a new slug with a counter appended
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        
        # Call the original save method
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title

class Comment(models.Model):
    """Comment model for blog posts"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='replies', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"

class Like(models.Model):
    """Like model for posts and comments"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes', null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='likes', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [
            ('user', 'post'),
            ('user', 'comment'),
        ]
        # Ensure a user can like either a post or a comment, not both with the same Like instance
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(post__isnull=False, comment__isnull=True) | 
                    models.Q(post__isnull=True, comment__isnull=False)
                ),
                name='like_either_post_or_comment'
            )
        ]
    
    def __str__(self):
        if self.post:
            return f"{self.user.username} likes post: {self.post.title}"
        return f"{self.user.username} likes comment: {self.comment.id}"

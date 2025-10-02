from django.db.models.signals import post_save
from django.dispatch import receiver
from posts.models import Like, Comment, Bookmark
from .models import Notification
from django.urls import reverse
from django.contrib.contenttypes.models import ContentType
from .utils import send_notification_to_user


@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    """Create a notification when a user likes a post or comment"""
    if not created:
        return
    
    # Skip notification if user likes their own content
    if instance.post and instance.user == instance.post.author:
        return
    elif instance.comment and instance.user == instance.comment.author:
        return
    
    try:
        if instance.post:
            content_type = ContentType.objects.get_for_model(instance.post)
            Notification.objects.create(
                recipient=instance.post.author,
                sender=instance.user,
                notification_type=Notification.LIKE,
                message=f"{instance.user.username} liked your post: {instance.post.title[:40]}",
                content_type=content_type,
                object_id=instance.post.id,
                redirect_url=f"/posts/{instance.post.slug}"
            )
            
            # Send real-time notification
            notification = Notification.objects.filter(
                recipient=instance.post.author,
                sender=instance.user,
                notification_type=Notification.LIKE,
                content_type=content_type,
                object_id=instance.post.id
            ).latest('created_at')
            
            send_notification_to_user(notification)
            
        elif instance.comment:
            content_type = ContentType.objects.get_for_model(instance.comment)
            Notification.objects.create(
                recipient=instance.comment.author,
                sender=instance.user,
                notification_type=Notification.LIKE,
                message=f"{instance.user.username} liked your comment on: {instance.comment.post.title[:40]}",
                content_type=content_type,
                object_id=instance.comment.id,
                redirect_url=f"/posts/{instance.comment.post.slug}#comment-{instance.comment.id}"
            )
            
            # Send real-time notification
            notification = Notification.objects.filter(
                recipient=instance.comment.author,
                sender=instance.user,
                notification_type=Notification.LIKE,
                content_type=content_type,
                object_id=instance.comment.id
            ).latest('created_at')
            
            send_notification_to_user(notification)
    except Exception as e:
        print(f"Error creating like notification: {e}")
@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Create a notification when a user comments on a post"""
    if not created:
        return
    
    try:
        # Notification for post author
        if instance.author != instance.post.author:
            content_type = ContentType.objects.get_for_model(instance.post)
            Notification.objects.create(
                recipient=instance.post.author,
                sender=instance.author,
                notification_type=Notification.COMMENT,
                message=f"{instance.author.username} commented on your post: {instance.post.title[:40]}",
                content_type=content_type,
                object_id=instance.post.id,
                redirect_url=f"/posts/{instance.post.slug}#comment-{instance.id}"
            )
        
            # Send real-time notification
            notification = Notification.objects.filter(
                recipient=instance.post.author,
                sender=instance.author,
                notification_type=Notification.COMMENT,
                content_type=content_type,
                object_id=instance.post.id
            ).latest('created_at')
            
            send_notification_to_user(notification)
        
        # Notification for parent comment author if this is a reply
        if instance.parent and instance.parent.author != instance.author:
            content_type = ContentType.objects.get_for_model(instance.parent)
            Notification.objects.create(
                recipient=instance.parent.author,
                sender=instance.author,
                notification_type=Notification.COMMENT,
                message=f"{instance.author.username} replied to your comment on: {instance.post.title[:40]}",
                content_type=content_type,
                object_id=instance.parent.id,
                redirect_url=f"/posts/{instance.post.slug}#comment-{instance.id}"
            )
        
            # Send real-time notification for parent comment author
            try:
                notification = Notification.objects.filter(
                    recipient=instance.parent.author,
                    sender=instance.author,
                    notification_type=Notification.COMMENT,
                    content_type=content_type,
                    object_id=instance.parent.id
                ).latest('created_at')
                
                send_notification_to_user(notification)
            except Notification.DoesNotExist:
                pass  # No notification found, might be due to race condition
    except Exception as e:
        print(f"Error creating comment notification: {e}")
@receiver(post_save, sender=Bookmark)
def create_bookmark_notification(sender, instance, created, **kwargs):
    """Create a notification when a user bookmarks a post"""
    if not created:
        return
    
    # Skip notification if user bookmarks their own post
    if instance.user == instance.post.author:
        return
    
    try:
        content_type = ContentType.objects.get_for_model(instance.post)
        Notification.objects.create(
            recipient=instance.post.author,
            sender=instance.user,
            notification_type=Notification.BOOKMARK,
            message=f"{instance.user.username} bookmarked your post: {instance.post.title[:40]}",
            content_type=content_type,
            object_id=instance.post.id,
            redirect_url=f"/posts/{instance.post.slug}"
        )
        
        # Send real-time notification
        notification = Notification.objects.filter(
            recipient=instance.post.author,
            sender=instance.user,
            notification_type=Notification.BOOKMARK,
            content_type=content_type,
            object_id=instance.post.id
        ).latest('created_at')
        
        send_notification_to_user(notification)
    except Exception as e:
        print(f"Error creating bookmark notification: {e}")
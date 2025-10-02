from django.contrib import admin
from django.utils.html import format_html
from .models import Post, Comment, Like, Tag, Category, Bookmark


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'post_count']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    
    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = 'Posts'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'post_count']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    
    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = 'Posts'


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'published', 'created_at', 'views_count']
    list_filter = ['published', 'created_at', 'category']
    search_fields = ['title', 'content', 'author__username']
    readonly_fields = ['created_at', 'updated_at', 'views_count', 'display_featured_image']
    filter_horizontal = ['tags']
    date_hierarchy = 'created_at'
    list_editable = ['published', 'category']
    list_per_page = 20
    fieldsets = (
        ('Post Information', {
            'fields': ('title', 'slug', 'author', 'content', 'excerpt', 'published')
        }),
        ('Categorization', {
            'fields': ('category', 'tags')
        }),
        ('Media', {
            'fields': ('featured_image', 'display_featured_image')
        }),
        ('Statistics', {
            'fields': ('views_count', 'created_at', 'updated_at')
        })
    )
    prepopulated_fields = {'slug': ('title',)}
    
    def display_featured_image(self, obj):
        if obj.featured_image:
            return format_html('<img src="{}" width="300" height="auto" />', obj.featured_image.url)
        return "No Image"
    display_featured_image.short_description = 'Featured Image Preview'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'post_title', 'content_preview', 'parent_comment', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['content', 'author__username', 'post__title']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    list_editable = ['is_approved']
    list_per_page = 20
    
    def post_title(self, obj):
        return obj.post.title
    post_title.short_description = 'Post'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
    
    def parent_comment(self, obj):
        return f"Reply to #{obj.parent.id}" if obj.parent else "Top level"
    parent_comment.short_description = 'Parent'


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'content_type', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'post__title']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def content_type(self, obj):
        if obj.post:
            return f"Post: {obj.post.title}"
        elif obj.comment:
            return f"Comment: {obj.comment.content[:30]}..."
        return "Unknown"
    content_type.short_description = 'Liked Content'


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'post_title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'post__title']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def post_title(self, obj):
        return obj.post.title
    post_title.short_description = 'Post'
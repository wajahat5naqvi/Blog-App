# Migration Guide

This guide outlines the steps needed to transition from the existing blog implementation to the new, enhanced version.

## Backend Migration Steps

### 1. Models Migration

#### Posts App

1. **Replace models.py with models_new.py**:
   ```bash
   cd blog_backend/posts
   cp models_new.py models.py
   ```

2. **Create and run migrations**:
   ```bash
   cd ../..
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Update serializers**:
   ```bash
   cd blog_backend/posts
   cp serializers_new.py serializers.py
   ```

4. **Update views and URLs**:
   ```bash
   cp views_new.py views.py
   cp urls_new.py urls.py
   cp admin_new.py admin.py
   ```

#### Accounts App

1. **Replace models.py with models_new.py**:
   ```bash
   cd ../accounts
   cp models_new.py models.py
   ```

2. **Create and run migrations**:
   ```bash
   cd ../..
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Update serializers, views and URLs**:
   ```bash
   cd blog_backend/accounts
   cp serializers_new.py serializers.py
   cp views_new.py views.py
   cp urls_new.py urls.py
   ```

### 2. Project Configuration

1. **Update settings.py to include new apps and settings**:
   - Add `rest_framework.pagination.PageNumberPagination` as the default pagination class
   - Configure media storage for user uploads
   - Add notification settings

2. **Update main urls.py to use new URL configurations**

### 3. Data Migration (if needed)

If you have existing data that needs to be preserved:

1. Create a custom data migration:
   ```bash
   python manage.py makemigrations posts --empty --name=migrate_existing_data
   ```

2. Edit the migration file to transfer data from old models to new models

## Frontend Migration Steps

### 1. API Service Updates

1. **Update API client services** to use new endpoints:
   - Update authentication flows
   - Update post and comment handling
   - Add new social features (following, bookmarks)

2. **Update TypeScript interfaces** to match new API responses

### 2. Component Updates

1. **Update Post components** to use the enhanced post model
2. **Add new UI components** for social features
3. **Update forms** to support new fields and validations

### 3. New Features Implementation

1. **Implement user profile pages** with follow functionality
2. **Add bookmarking UI** for saving posts
3. **Enhance comment system** with threading
4. **Add notification UI** for user alerts

## Testing Migration

1. **Test API endpoints** using tools like Postman or curl
2. **Verify frontend functionality** with the new API
3. **Check authentication flows** function as expected
4. **Test social features** like following and bookmarks

## Rollback Plan

If issues are encountered during migration:

1. **Restore database backups** if data corruption occurs
2. **Revert code changes** using git
3. **Roll back migrations** if database schema issues occur:
   ```bash
   python manage.py migrate posts [previous_migration_name]
   python manage.py migrate accounts [previous_migration_name]
   ```

## Post-Migration Verification

1. **Check admin interface** works with new models
2. **Verify API documentation** reflects new endpoints
3. **Test all CRUD operations** through frontend
4. **Ensure permissions** are correctly applied
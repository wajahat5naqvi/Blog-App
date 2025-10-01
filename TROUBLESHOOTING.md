# Troubleshooting 500 Internal Server Error in Blog Application

This document provides guidance on common causes and solutions for 500 Internal Server Error when submitting posts in this Next.js + Django blog application.

## Common Backend Issues

### 1. Django Media Folder Permissions

The 500 error may be due to missing write permissions on the `media` folder where uploaded images are stored:

```bash
# Fix media folder permissions
chmod -R 755 /path/to/blog_project/blog_backend/media
```

### 2. Missing Required Python Packages

Ensure all required packages are installed:

```bash
# Install Pillow for image handling
pip install Pillow

# Install all requirements
pip install -r requirements.txt
```

### 3. Django Migration Issues

Ensure all migrations are applied:

```bash
python manage.py migrate
```

### 4. Check Django Logs

Look for detailed error messages in Django logs:

```bash
# Run Django with more verbose output
python manage.py runserver --traceback
```

## Frontend Debugging

### 1. Check Network Requests

Use browser developer tools to inspect network requests:
- Check the request payload
- Verify authorization headers
- Examine response data

### 2. Validate JWT Token

Ensure JWT tokens are properly formatted and not expired:
- Check localStorage for valid tokens
- Verify token format in API requests

### 3. FormData Handling

FormData issues are common when submitting posts:
- Check that file data is properly formatted
- Ensure tags are sent as individual items, not as JSON string
- Verify content types are set appropriately

## Backend Model Requirements

In the Django Post model:

1. The `author` field is required and must be set from request.user
2. The `title` and `content` fields are required
3. Tags must be properly formatted as a list of strings
4. Featured image must be a valid image file format

## Common Error Types

### 1. 500 Server Error

Usually indicates:
- Exception in Django view code
- Database errors
- File system permission issues
- Invalid request data that causes unhandled exceptions

### 2. 401 Unauthorized

Indicates:
- Missing or invalid JWT token
- Expired token that couldn't be refreshed

### 3. 400 Bad Request

Indicates:
- Missing required fields
- Invalid data format
- Validation errors

## Complete Solution

A complete solution involves:

1. **Backend Checks**:
   - Verify Django model field requirements
   - Check media folder permissions
   - Ensure proper serializer validation
   - Add error logging in Django views

2. **Frontend Updates**:
   - Proper JWT token handling
   - Correct FormData formatting for file uploads and tags
   - Comprehensive error handling
   - User-friendly error messages

## Next Steps

If errors persist after implementing the fixes in this project:

1. Check Django server logs for detailed error messages
2. Enable DEBUG mode temporarily in Django settings
3. Use network monitoring tools to inspect the exact request/response data
4. Add more granular error logging in both frontend and backend
from rest_framework import permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to allow only authors of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the author
        return obj.author == request.user


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Permission to allow only admin users to modify objects.
    Regular users can only view.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to admin users
        return request.user.is_authenticated and request.user.is_staff


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to allow only owners of an object to edit it.
    Used for models that have a user field instead of author field.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to the owner
        return obj.user == request.user
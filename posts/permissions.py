from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the post.
        return obj.author == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    General version for any model with owner/user field.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check for different possible owner field names
        owner_fields = ['owner', 'user', 'author', 'customer', 'creator']
        for field in owner_fields:
            if hasattr(obj, field):
                return getattr(obj, field) == request.user
        
        return False


class IsConnectedOrPublic(permissions.BasePermission):
    """
    Permission that allows access to public content or content from connected users.
    """

    def has_object_permission(self, request, view, obj):
        # Always allow safe methods for public content
        if request.method in permissions.SAFE_METHODS:
            if obj.privacy == 'public':
                return True
            
            # Check if user is connected to the author
            if hasattr(obj, 'author'):
                if obj.author == request.user:
                    return True
                
                from accounts.models import Connection
                is_connected = Connection.objects.filter(
                    Q(from_user=request.user, to_user=obj.author, status='accepted') |
                    Q(from_user=obj.author, to_user=request.user, status='accepted')
                ).exists()
                
                if obj.privacy == 'connections' and is_connected:
                    return True
                
                return obj.privacy == 'public'
        
        # For write methods, only allow if user is the author
        return hasattr(obj, 'author') and obj.author == request.user


class IsPremiumUser(permissions.BasePermission):
    """
    Permission for premium-only features.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return getattr(request.user, 'is_premium', False)


class IsBusinessUser(permissions.BasePermission):
    """
    Permission for business users only.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return getattr(request.user, 'is_business', False)


class CanModerateContent(permissions.BasePermission):
    """
    Permission for content moderators.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (request.user.is_staff or 
                request.user.is_superuser or 
                getattr(request.user, 'is_moderator', False))


class IsSellerOrReadOnly(permissions.BasePermission):
    """
    Permission for e-commerce: only sellers can modify their products.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return hasattr(obj, 'seller') and obj.seller == request.user
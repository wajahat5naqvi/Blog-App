from rest_framework import generics, status, permissions, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import IntegrityError

from .serializers_new import (
    RegisterSerializer, UserSerializer, UserDetailSerializer,
    ProfileSerializer, PasswordChangeSerializer, FollowSerializer,
    NotificationSerializer
)
from .models_new import Profile, Follow, Notification

User = get_user_model()


class StandardResultsPagination:
    """Standard pagination for all list views"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RegisterView(generics.CreateAPIView):
    """API view for user registration"""
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        """Override to return tokens with the response for immediate login"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "message": "User registration successful"
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """API view for user logout - blacklist the refresh token"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Logout successful, token blacklisted."}, 
                status=status.HTTP_205_RESET_CONTENT
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(APIView):
    """API view to retrieve current authenticated user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user details"""
        serializer = UserDetailSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user profiles, read-only"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username']
    pagination_class = StandardResultsPagination
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserSerializer
        return UserDetailSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        """Follow a user"""
        user_to_follow = self.get_object()
        user = request.user
        
        # Prevent following yourself
        if user == user_to_follow:
            return Response({
                "detail": "You cannot follow yourself."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already following
        if Follow.objects.filter(follower=user, following=user_to_follow).exists():
            return Response({
                "detail": "You are already following this user."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create follow relationship
            follow = Follow.objects.create(follower=user, following=user_to_follow)
            
            # Create notification for the user being followed
            Notification.objects.create(
                recipient=user_to_follow,
                sender=user,
                notification_type='follow'
            )
            
            return Response({
                "detail": f"You are now following {user_to_follow.username}."
            }, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({
                "detail": "Failed to follow user. Please try again."
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfollow(self, request, pk=None):
        """Unfollow a user"""
        user_to_unfollow = self.get_object()
        user = request.user
        
        # Check if following
        try:
            follow = Follow.objects.get(follower=user, following=user_to_unfollow)
            follow.delete()
            return Response({
                "detail": f"You have unfollowed {user_to_unfollow.username}."
            }, status=status.HTTP_200_OK)
        except Follow.DoesNotExist:
            return Response({
                "detail": "You are not following this user."
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """Get followers of a user"""
        user = self.get_object()
        followers = Follow.objects.filter(following=user)
        
        page = self.paginate_queryset(followers)
        if page is not None:
            serializer = FollowSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = FollowSerializer(followers, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """Get users followed by a user"""
        user = self.get_object()
        following = Follow.objects.filter(follower=user)
        
        page = self.paginate_queryset(following)
        if page is not None:
            serializer = FollowSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = FollowSerializer(following, many=True, context={'request': request})
        return Response(serializer.data)


class ProfileView(generics.RetrieveUpdateAPIView):
    """API view to retrieve and update user profile"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer
    
    def get_object(self):
        """Get profile for current user"""
        return self.request.user.profile


class PasswordChangeView(generics.GenericAPIView):
    """API view for changing password"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if current password is correct
        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response(
                {"current_password": ["Wrong password."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        
        return Response(
            {"detail": "Password successfully changed."},
            status=status.HTTP_200_OK
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    
    def get_queryset(self):
        """Only return notifications for the current user"""
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response(
            {"detail": "All notifications marked as read."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response(
            {"detail": "Notification marked as read."},
            status=status.HTTP_200_OK
        )
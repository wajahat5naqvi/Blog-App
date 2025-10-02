from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views_new import (
    RegisterView, LogoutView, ProfileView, CurrentUserView,
    UserViewSet, PasswordChangeView, NotificationViewSet
)

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # User & profile endpoints
    path('me/', CurrentUserView.as_view(), name='me'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', PasswordChangeView.as_view(), name='change_password'),
]
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer
from .models import Profile

class RegisterView(generics.CreateAPIView):
    """API view for user registration"""
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

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

class ProfileAPIView(generics.RetrieveUpdateAPIView):
    """API view to retrieve and update user profile"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer
    
    def get_object(self):
        return self.request.user.profile

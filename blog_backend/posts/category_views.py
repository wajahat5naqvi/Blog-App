from rest_framework import viewsets, permissions, filters
from .models import Category
from .category_serializers import CategorySerializer

class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for CRUD operations on categories"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    lookup_field = 'slug'
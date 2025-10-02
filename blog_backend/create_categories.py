from django.core.management import execute_from_command_line
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog_backend.settings')
django.setup()

from posts.models import Category

# Create categories
categories = ['Technology', 'Travel', 'Food', 'Lifestyle', 'Health']

for category_name in categories:
    Category.objects.get_or_create(name=category_name)
    print(f"Created category: {category_name}")

print("Categories creation completed!")
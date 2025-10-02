from django.core.management import execute_from_command_line
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog_backend.settings')
django.setup()

from posts.models import Category
from django.utils.text import slugify

categories = ['Technology', 'Travel', 'Food', 'Lifestyle', 'Health']

for name in categories:
    if not Category.objects.filter(name=name).exists():
        c = Category(name=name)
        c.slug = slugify(name)
        c.save()
        print(f'Added {name}')
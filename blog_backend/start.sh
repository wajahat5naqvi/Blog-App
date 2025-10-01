#!/bin/bash

# Blog Backend Start Script
# This script will reset migrations if needed and start the server

echo "=== Blog Backend Start Script ==="

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Install dependencies if needed
if ! pip show drf-yasg > /dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Reset migrations if needed
if [ "$1" == "--reset-migrations" ]; then
    echo "Resetting migrations..."
    
    # Delete migration files but keep __init__.py
    echo "Removing old migrations..."
    find ./accounts/migrations/ -name "*.py" -not -name "__init__.py" -delete
    find ./posts/migrations/ -name "*.py" -not -name "__init__.py" -delete
    
    # Remove database
    echo "Removing database..."
    rm -f db.sqlite3
fi

# Make sure __init__.py exists in migrations directories
echo "Ensuring __init__.py files exist..."
mkdir -p ./accounts/migrations/
mkdir -p ./posts/migrations/
touch ./accounts/migrations/__init__.py
touch ./posts/migrations/__init__.py

# Create migrations
echo "Creating migrations..."
python3 manage.py makemigrations accounts
python3 manage.py makemigrations posts

# Apply migrations
echo "Applying migrations..."
python3 manage.py migrate

# Create a superuser if it doesn't exist
echo "Creating a superuser..."
python3 manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
    print('Superuser created successfully!')
else:
    print('Superuser already exists.')
"

# Run the development server
echo "Starting development server..."
python3 manage.py runserver 0.0.0.0:8000
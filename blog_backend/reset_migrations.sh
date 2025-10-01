#!/bin/bash

# Reset migrations script
# This script will delete all migration files, recreate them, and apply them fresh

echo "=== Django Migration Reset Script ==="
echo "This will delete all migrations and create fresh ones."

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Backup the database first (optional)
echo "Creating database backup..."
cp db.sqlite3 db.sqlite3.backup

# Delete migration files but keep __init__.py
echo "Removing old migrations..."
find ./accounts/migrations/ -name "*.py" -not -name "__init__.py" -delete
find ./posts/migrations/ -name "*.py" -not -name "__init__.py" -delete

# Make sure __init__.py exists in migrations directories
echo "Ensuring __init__.py files exist..."
touch ./accounts/migrations/__init__.py
touch ./posts/migrations/__init__.py

# Create fresh migrations
echo "Creating fresh migrations..."
python3 manage.py makemigrations accounts
python3 manage.py makemigrations posts

# Apply migrations
echo "Applying migrations..."
python3 manage.py migrate

echo "Migration reset completed successfully!"
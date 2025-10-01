# Blog Backend - Django REST Framework API

A blog backend API built with Django REST Framework, featuring user authentication with JWT, blog posts, comments, and likes functionality.

## Installation and Setup

### Prerequisites
- Python 3.8 or higher
- pip

### Setup Steps

1. Clone the repository:
```bash
git clone https://your-repository-url.git
cd blog_project
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
cd blog_backend
pip install -r requirements.txt
```

4. Run the start script to set up the database and start the server:
```bash
./start.sh
```

### Handling Migration Issues

If you encounter migration issues like `Dependency on app with no migrations: accounts`, follow these steps to reset migrations:

#### Option 1: Use the start script with the reset flag:

```bash
./start.sh --reset-migrations
```

This will:
- Delete all migration files (except `__init__.py`)
- Remove the existing database
- Create fresh migrations for all apps
- Apply the migrations
- Create a superuser

#### Option 2: Manual migration reset:

1. Ensure migration directories have `__init__.py` files:
```bash
mkdir -p accounts/migrations/
mkdir -p posts/migrations/
touch accounts/migrations/__init__.py
touch posts/migrations/__init__.py
```

2. Delete existing migration files (except `__init__.py`):
```bash
find ./accounts/migrations/ -name "*.py" -not -name "__init__.py" -delete
find ./posts/migrations/ -name "*.py" -not -name "__init__.py" -delete
```

3. Delete the database:
```bash
rm db.sqlite3
```

4. Create fresh migrations:
```bash
python manage.py makemigrations accounts
python manage.py makemigrations posts
```

5. Apply migrations:
```bash
python manage.py migrate
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

## API Endpoints

- `/api/register/` - Register a new user
- `/api/token/` - Get JWT token (login)
- `/api/token/refresh/` - Refresh JWT token
- `/api/logout/` - Logout (blacklist token)
- `/api/profile/` - Retrieve/update user profile
- `/api/posts/` - List/create posts
- `/api/posts/<id>/` - Retrieve/update/delete a post
- `/api/posts/<id>/comments/` - List/add comments to a post
- `/api/comments/<id>/` - Update/delete a comment
- `/api/posts/<id>/like/` - Like/unlike a post
- `/api/comments/<id>/like/` - Like/unlike a comment

## Admin Interface

Access the admin interface at `/admin/` with the following credentials:
- Username: admin
- Password: adminpassword
# Modern Blog Platform

A full-featured blog platform built with Django/Django REST Framework for the backend and Next.js/React for the frontend.

## Features

### Backend (Django + DRF)

- **User Authentication**
  - JWT-based auth with access and refresh tokens
  - User registration with email verification
  - Password reset functionality
  - Profile management
  
- **User Profiles**
  - Custom user model with profile information
  - Profile pictures and social media links
  - Follow/unfollow functionality
  - User notifications system
  
- **Content Management**
  - Blog posts with rich text content
  - Categories and tags for organizing content
  - Comments with threaded replies
  - Like/unlike functionality for posts and comments
  
- **Additional Features**
  - Bookmarking posts
  - View count tracking
  - Search functionality (posts, tags, users)
  - Admin dashboard for content moderation

### Frontend (Next.js + React)

- **Authentication**
  - Login/register forms with validation
  - Protected routes for authenticated users
  - Profile management
  
- **Post Management**
  - Create, edit, and delete posts
  - Rich text editor with image uploads
  - Tag and category selection
  
- **Content Consumption**
  - Responsive design for all devices
  - Infinite scrolling post lists
  - Post detail views with comments
  - Related posts suggestions
  
- **Social Features**
  - Follow other users
  - Like and comment on posts
  - Bookmark posts for later
  - User profile pages

## Technical Implementation

### Backend (Django + DRF)

The backend is built with Django and Django REST Framework, providing a robust API for the frontend to consume. Key components include:

#### Models

- **User & Profile**: Custom user model with related profile model
- **Post**: Blog post with title, content, featured image, etc.
- **Category & Tag**: For categorizing and tagging posts
- **Comment**: Threaded comment system with parent/child relationships
- **Like**: For liking posts and comments
- **Bookmark**: For saving posts for later
- **Follow**: For user following relationships
- **Notification**: For user notifications

#### API Endpoints

- **Authentication**: `/api/accounts/token/`, `/api/accounts/register/`, etc.
- **Posts**: `/api/posts/`, `/api/posts/{id}/`, etc.
- **Comments**: `/api/comments/`, `/api/comments/{id}/`, etc.
- **Users**: `/api/accounts/users/`, `/api/accounts/users/{id}/`, etc.
- **Social**: Follow, like, bookmark functionality

### Frontend (Next.js + React)

The frontend is built with Next.js and React, providing a fast and responsive user experience. Key components include:

- **Layout**: Responsive layout with Navbar and Footer
- **Authentication**: Login/register forms with validation
- **Post Forms**: Create and edit posts with rich text editor
- **Post Lists**: Home page, category pages, tag pages
- **Post Detail**: View post with comments
- **User Profile**: User profile page with posts, following, etc.

## Getting Started

### Backend Setup

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run migrations: `python manage.py migrate`
4. Create a superuser: `python manage.py createsuperuser`
5. Run the server: `python manage.py runserver`

### Frontend Setup

1. Navigate to the frontend directory: `cd blog_frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## API Documentation

The API is documented using Django REST Framework's built-in documentation. You can access it at `/api/docs/` when the server is running.

## Deployment

### Backend Deployment

The backend can be deployed to any server that supports Django. Some options include:

- **Heroku**: Easy deployment with `Procfile`
- **AWS**: More control over server configuration
- **DigitalOcean**: Simple deployment with Django-friendly options

### Frontend Deployment

The frontend can be deployed to various services, including:

- **Vercel**: Optimal for Next.js applications
- **Netlify**: Simple deployment from Git repositories
- **AWS S3/CloudFront**: For more complex setups

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
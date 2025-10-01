'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Link from 'next/link';
import { postService } from './services/api';
import { Post } from './components/PostCard';
import PostCard from './components/PostCard';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorAlert from './components/ErrorAlert';
import Image from 'next/image';
import { getImageUrl, handleImageError } from './utils/imageUtils';
import Carousel from 'react-bootstrap/Carousel';

export default function Home() {
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await postService.getAllPosts();
        const posts = response.data;
        
        // Get up to 3 featured posts (in a real app, you might have a featured flag)
        setFeaturedPosts(posts.slice(0, 3));
        
        // Get recent posts (skip featured posts)
        setRecentPosts(posts.slice(3, 9));
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message="Error loading posts" details={error} />;
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h1 className="display-4 fw-bold mb-3">Welcome to BlogHub</h1>
              <p className="lead mb-4">
                Share your thoughts, read interesting stories, and connect with writers from around the world.
              </p>
              <Link href="/posts/new" className="btn btn-light btn-lg">
                Create a Post
              </Link>
            </Col>
            <Col md={6} className="d-none d-md-block">
              <div className="position-relative" style={{ height: '300px' }}>
                <Image
                  src="/next.svg"
                  alt="Blog Illustration"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                  onError={handleImageError}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Posts Section */}
      <section className="py-5">
        <Container>
          <h2 className="mb-4 border-bottom pb-2">Featured Posts</h2>

          {featuredPosts.length > 0 ? (
            <Carousel indicators={false}>
              {featuredPosts.map((post) => (
                <Carousel.Item key={post.id}>
                  <div 
                    className="position-relative d-flex align-items-center justify-content-center bg-dark"
                    style={{ height: '400px' }}
                  >
                    {post.featured_image ? (
                      <Image
                        src={getImageUrl(post.featured_image) || '/default-image.jpg'}
                        alt={post.title}
                        fill
                        style={{ objectFit: 'cover', opacity: 0.6 }}
                        sizes="100vw"
                        priority
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="position-absolute w-100 h-100 bg-dark"></div>
                    )}
                    <div className="carousel-caption text-center p-4 rounded" style={{ maxWidth: '700px', background: 'rgba(0,0,0,0.5)' }}>
                      <h3>{post.title}</h3>
                      <p className="mb-3">By {post.author.username}</p>
                      <Link href={'/posts/' + post.id} className="btn btn-light">
                        Read Post
                      </Link>
                    </div>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          ) : (
            <div className="text-center py-5 bg-light rounded">
              <h3>No featured posts yet</h3>
              <p>Be the first to create a post!</p>
              <Link href="/posts/new" className="btn btn-primary">
                Create a Post
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Recent Posts Section */}
      <section className="py-5 bg-light">
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Recent Posts</h2>
            <Link href="/posts" className="btn btn-outline-primary">
              View All Posts
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <Row xs={1} md={2} lg={3} className="g-4">
              {recentPosts.map((post) => (
                <Col key={post.id}>
                  <PostCard post={post} />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center py-4">
              <p>No recent posts available</p>
            </div>
          )}
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-secondary text-white text-center">
        <Container className="py-3">
          <h2 className="mb-3">Ready to share your story?</h2>
          <p className="lead mb-4">Join our community and start creating amazing content today!</p>
          <Link href="/auth/register" className="btn btn-light btn-lg me-2">
            Sign Up Now
          </Link>
          <Link href="/posts/new" className="btn btn-outline-light btn-lg">
            Create a Post
          </Link>
        </Container>
      </section>
    </div>
  );
}

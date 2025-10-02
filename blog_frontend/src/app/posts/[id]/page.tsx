'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { Container, Row, Col, Button, Form, Card, Badge } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { postService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import Comment, { CommentType } from '../../components/Comment';
import Link from 'next/link';
import { Post as PostType } from '../../components/PostCard';
import FormattedDate from '../../components/FormattedDate';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import SocialShareButtons from '../../components/SocialShareButtons';
import PostSEO from '../../components/PostSEO';

interface Post extends PostType {
  updated_at: string;
}

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  // Unwrap the params Promise using React.use() at the top level of the component
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  
  // Used for social sharing
  const [pageUrl, setPageUrl] = useState<string>('');
  
  // State declarations
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Fetch post data
  useEffect(() => {
    // Make sure postId is available before fetching
    if (!postId) return;
    
    // Set page URL for sharing
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
    
    const fetchPost = async () => {
      try {
        const response = await postService.getPostById(postId);
        setPost(response.data);
        setLiked(response.data.is_liked);
        
        // Track page view for analytics
        try {
          await postService.trackPostView(postId);
        } catch (viewErr) {
          console.error('Error tracking post view:', viewErr);
          // Non-critical error, so we don't need to show it to the user
        }
        
        // Fetch comments for the post
        const commentsResponse = await postService.getComments(postId);
        setComments(commentsResponse.data);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load the post. It may have been removed or you may not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId) return;

    setSubmitting(true);
    try {
      const response = await postService.addComment(postId, newComment);
      // Add new comment to the comments list
      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewReply = (newReply: CommentType) => {
    // Find the parent comment and add the reply
    const updatedComments = comments.map(comment => {
      if (comment.id === newReply.parent) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      return comment;
    });
    
    setComments(updatedComments);
  };

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!postId) {
      console.error('Post ID is not available');
      return;
    }

    try {
      if (liked) {
        await postService.unlikePost(postId);
        setLiked(false);
        setPost(prev => prev ? { ...prev, likes_count: prev.likes_count - 1, is_liked: false } : null);
      } else {
        await postService.likePost(postId);
        setLiked(true);
        setPost(prev => prev ? { ...prev, likes_count: prev.likes_count + 1, is_liked: true } : null);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !post) {
    return <ErrorAlert message="Error" details={error || 'Post not found'} />;
  }

  const isAuthor = isAuthenticated && user?.id === post.author.id;

  return (
    <Container className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          {/* Post Header */}
          <h1 className="mb-3">{post.title}</h1>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <p className="text-muted mb-0">
                By <strong>{post.author.username}</strong> on <FormattedDate dateString={post.created_at} />
              </p>
            </div>
            {isAuthor && (
              <div>
                <Link href={`/posts/edit/${post.id}`} className="btn btn-outline-primary btn-sm me-2">
                  Edit Post
                </Link>
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div className="mb-4">
            {post.tags.map(tag => (
              <Badge bg="secondary" key={tag.id} className="me-1">{tag.name}</Badge>
            ))}
          </div>
          
          {/* Featured Image */}
          {post.featured_image && (
            <div className="mb-4 position-relative" style={{ height: '400px' }}>
              <Image
                src={getImageUrl(post.featured_image) || '/default-image.jpg'}
                alt={post.title}
                fill
                style={{ objectFit: 'cover' }}
                className="rounded"
                onError={handleImageError}
                sizes="100vw"
                priority
              />
            </div>
          )}
          
          {/* Post Content */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div className="post-content mb-4">
                {post.content.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              
              {/* Like and Share */}
              <div className="d-flex align-items-center justify-content-between">
                <Button
                  variant={liked ? "primary" : "outline-primary"}
                  onClick={handleLikeToggle}
                  className="d-flex align-items-center"
                >
                  <i className={`bi ${liked ? 'bi-heart-fill' : 'bi-heart'} me-2`}></i>
                  {post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}
                </Button>
                
                {pageUrl && (
                  <SocialShareButtons
                    url={pageUrl}
                    title={post.title}
                    description={post.content.substring(0, 100) + '...'}
                    image={post.featured_image ? getImageUrl(post.featured_image) : undefined}
                    variant="icons"
                    size="md"
                  />
                )}
              </div>
            </Card.Body>
          </Card>
          
          {/* Comments Section */}
          <h3 className="mb-4">Comments</h3>
          
          {/* Comment Form */}
          {isAuthenticated ? (
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h5>Leave a Comment</h5>
                <Form onSubmit={handleCommentSubmit}>
                  <Form.Group className="mb-3" controlId="commentContent">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your comment here..."
                      required
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          ) : (
            <Card className="mb-4 bg-light">
              <Card.Body className="text-center">
                <p className="mb-0">
                  <Link href="/auth/login">Login</Link> or <Link href="/auth/register">Register</Link> to post a comment.
                </p>
              </Card.Body>
            </Card>
          )}
          
          {/* Comments List */}
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                postId={postId}
                onNewReply={handleNewReply}
              />
            ))
          ) : (
            <p className="text-center text-muted">No comments yet. Be the first to comment!</p>
          )}
        </Col>
      </Row>
    </Container>
  );
}
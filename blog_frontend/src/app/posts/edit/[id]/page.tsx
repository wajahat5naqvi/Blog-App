'use client';

import { useEffect, useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useParams, useRouter } from 'next/navigation';
import { postService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PostForm from '../../components/PostForm';

// Helper to join tags array into comma-separated string
const formatTags = (tags: any[]): string => {
  if (!tags || !Array.isArray(tags)) return '';
  return tags.map(tag => typeof tag === 'object' ? tag.name : tag).join(', ');
};

export default function EditPostPage() {
  const { id } = useParams();
  const postId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    // Make sure postId is defined before fetching
    if (!postId) {
      setError('Invalid post ID');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const response = await postService.getPostById(String(postId));
        const postData = response.data;
        
        // Check if current user is the author
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          if (postData.author.id !== currentUser.id) {
            setUnauthorized(true);
            setLoading(false);
            return;
          }
        } else {
          // No user found in localStorage
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        
        setPost(postData);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, isAuthenticated]);

  const handleUpdateSuccess = () => {
    // Redirect to post detail page after successful update
    router.push(`/posts/${postId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (unauthorized) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Unauthorized</Alert.Heading>
          <p>You do not have permission to edit this post.</p>
        </Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Post Not Found</Alert.Heading>
          <p>The post you are trying to edit does not exist.</p>
        </Alert>
      </Container>
    );
  }

  // Format the initial data for the form
  const initialData = {
    title: post.title,
    content: post.content,
    tags: formatTags(post.tags),
  };

  return (
    <Container className="py-5">
      <h1>Edit Post</h1>
      <PostForm 
        initialData={initialData} 
        isEditing={true} 
        postId={postId}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </Container>
  );
}
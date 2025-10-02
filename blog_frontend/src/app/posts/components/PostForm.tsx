'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { postService } from '../../services/api';
import { safeConsoleError } from '../../utils/errorHelpers';

interface PostFormData {
  title: string;
  content: string;
  tags?: string;
  featuredImage?: File | null;
}

interface PostFormProps {
  initialData?: PostFormData;
  isEditing?: boolean;
  postId?: string;
  onUpdateSuccess?: () => void;
}

export default function PostForm({ initialData, isEditing = false, postId, onUpdateSuccess }: PostFormProps) {
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Handle image selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFeaturedImage(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Process tags into array format
  const processTagsInput = (tagsInput: string): string[] => {
    if (!tagsInput.trim()) return [];
    
    return tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50);
  };
  
  // Handle form submission
    const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    
    // Begin submission
    setLoading(true);
    
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      
      // Process tags
      const validTags = processTagsInput(tags);
      validTags.forEach(tag => {
        formData.append('tags', tag);
      });
      
      // Add image if available
      if (featuredImage) {
        formData.append('featured_image', featuredImage);
      }
      
      let response;
      
      if (isEditing && postId) {
        // Call API to update the post
        response = await postService.updatePost(postId, formData);
        
        // Handle successful update
        if (response.status === 200) {
          setSuccess('Post updated successfully!');
          
          // Call the callback if provided
          if (onUpdateSuccess) {
            onUpdateSuccess();
          }
        } else {
          // Handle unexpected success case
          setError(`Unexpected response: ${response.status} ${response.statusText}`);
        }
      } else {
        // Call API to create the post
        response = await postService.createPost(formData);
        
        // Handle successful creation
        if (response.status === 201) {
          setSuccess('Post created successfully!');
          
          // Reset form
          setTitle('');
          setContent('');
          setTags('');
          setFeaturedImage(null);
          setImagePreview(null);
          
          // Redirect to the posts page
          router.push('/posts');
        } else {
          // Handle non-201 status (unexpected success case)
          setError(`Unexpected response: ${response.status} ${response.statusText}`);
        }
      }
    } catch (err: any) {
      safeConsoleError('Error ' + (isEditing ? 'updating' : 'creating') + ' post:', err);
      
      // Extract meaningful error message
      let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} post. Please try again.`;
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = Array.isArray(err.response.data.detail) 
            ? err.response.data.detail.join(' ') 
            : err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            disabled={loading}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Content</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content here..."
            disabled={loading}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma separated)</Form.Label>
          <Form.Control
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="technology, programming, react"
            disabled={loading}
          />
          <Form.Text className="text-muted">
            Enter up to 10 tags, separated by commas
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Label>Featured Image</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
          />
          <Form.Text className="text-muted">
            Optional. Maximum size: 5MB
          </Form.Text>
          
          {imagePreview && (
            <div className="mt-3">
              <img 
                src={imagePreview}
                alt="Preview" 
                className="img-thumbnail"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
        </Form.Group>
        
        <div className="d-flex gap-2">
          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Submitting...' : isEditing ? 'Update Post' : 'Create Post'}
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </Container>
  );
}
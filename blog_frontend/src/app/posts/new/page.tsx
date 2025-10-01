'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { postService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

// Utility function to safely process tags input
const processTagsInput = (tagsInput: string): string[] => {
  if (!tagsInput.trim()) return [];
  
  return tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0 && tag.length <= 50); // Max 50 chars per tag
};

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  
  // Check if user is authenticated
  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/posts/new');
    } else {
      setPageLoading(false);
    }
  }, [isAuthenticated, router]);
  
  // Validate tags input
  const validateTags = () => {
    if (!tags.trim()) {
      setTagsError(null);
      return;
    }
    
    const validatedTags = processTagsInput(tags);
    
    if (validatedTags.length === 0) {
      setTagsError('Please enter valid tags separated by commas');
      return;
    }
    
    if (validatedTags.some(tag => tag.length > 50)) {
      setTagsError('Each tag must be 50 characters or less');
      return;
    }
    
    if (validatedTags.length > 10) {
      setTagsError('Maximum 10 tags allowed');
      return;
    }
    
    setTagsError(null);
  };
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Form validation
    if (!title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      setLoading(false);
      return;
    }
    
    // Double check authentication using our utility from the API service
    // This handles both existence check and validation in one step
    const validToken = window.localStorage.getItem('token');
    if (!isAuthenticated || !validToken) {
      setError('You must be logged in to create a post.');
      setLoading(false);
      router.push('/auth/login?redirect=/posts/new');
      return;
    }
    
    try {
      // Always create a fresh FormData instance to avoid any lingering data
      // This ensures each request is clean and doesn't carry over data from previous requests
      const formData = new FormData();
      
      // Add required text fields
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      
      // Validate and add tags
      validateTags();
      if (tagsError) {
        setError(tagsError);
        setLoading(false);
        return;
      }
      
      // Process tags using our utility function
      const validTags = processTagsInput(tags);
      
      // Django REST Framework with PostCreateUpdateSerializer expects multiple form fields with the same name
      // The serializer has tags = serializers.ListField(child=serializers.CharField())
      if (validTags.length > 0) {
        validTags.forEach(tag => {
          formData.append('tags', tag);
        });
        console.log(`Adding ${validTags.length} tags to form data`);
      }
      
      // Add image if present
      if (featuredImage) {
        // Validate image type
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(featuredImage.type)) {
          setError('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
          setLoading(false);
          return;
        }
        
        // Validate image size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (featuredImage.size > maxSize) {
          setError(`Image file is too large. Maximum size is 5MB (your file: ${(featuredImage.size / 1024 / 1024).toFixed(2)}MB).`);
          setLoading(false);
          return;
        }
        
        try {
          // Clean filename to prevent issues
          const cleanFileName = featuredImage.name.replace(/[^\w\s.-]/gi, '');
          const renamedFile = new File([featuredImage], cleanFileName, { 
            type: featuredImage.type,
            lastModified: featuredImage.lastModified
          });
          
          // Check if the file was correctly created
          if (renamedFile.size === 0 && featuredImage.size > 0) {
            console.error('File creation failed - empty file created');
            setError('Error processing your image. Please try with a different image file.');
            setLoading(false);
            return;
          }
          
          formData.append('featured_image', renamedFile);
          
          // Detailed logging
          console.log('Image details:', {
            name: renamedFile.name,
            type: renamedFile.type,
            size: `${(renamedFile.size / 1024 / 1024).toFixed(2)}MB`,
            lastModified: new Date(renamedFile.lastModified).toISOString()
          });
        } catch (err) {
          console.error('Error processing image file:', err);
          setError('Error preparing your image for upload. Please try with a different image.');
          setLoading(false);
          return;
        }
      }
      
      // Log form data for debugging
      console.group('Submitting post with form data:');
      console.log('Title:', formData.get('title'));
      console.log('Content length:', formData.get('content')?.toString().length || 0, 'characters');
      
      // Log tags
      console.log('Tags:');
      const tagValues = [];
      for (let [key, value] of formData.entries()) {
        if (key === 'tags') {
          tagValues.push(value);
          console.log(`- ${value}`);
        }
      }
      console.log(`Total tags: ${tagValues.length}`);
      
      // Log image details if present
      const imageFile = formData.get('featured_image') as File | null;
      if (imageFile) {
        console.log('Image:', {
          name: imageFile.name,
          type: imageFile.type,
          size: `${(imageFile.size / 1024).toFixed(2)} KB`
        });
      } else {
        console.log('No image attached');
      }
      console.groupEnd();
      
      // Submit to API
      const response = await postService.createPost(formData);
      console.log('Full API response:', response);
      
      // Check for empty response data
      if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
        console.error('Server returned empty response data');
        setError('The server returned an empty response. Please try again or contact support.');
        setLoading(false);
        return;
      }
      
      // Success case
      if (response.status >= 200 && response.status < 300) {
        console.log('Post created successfully:', response.data);
        
        try {
          // Reset form state to ensure next post creation works correctly
          setTitle('');
          setContent('');
          setTags('');
          setTagsError(null);
          setFeaturedImage(null);
          setImagePreview(null);
          setError(null);
          
          // Reset any file input elements
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          // Show success message and redirect
          alert('Post created successfully!');
          router.push(`/posts/${response.data.id}`);
        } catch (resetError) {
          console.error('Error resetting form:', resetError);
          // Still redirect even if form reset fails
          router.push(`/posts/${response.data.id}`);
        }
        return;
      }
      
      // Error handling based on status code
      switch (response.status) {
        case 400: {
          // Handle validation errors
          let errorData = response.data;
          let errorMessage = 'Please correct the following errors:';
          
          // Check for our special _error_context property to log debugging info
          if (errorData && typeof errorData === 'object' && '_error_context' in errorData) {
            console.log('Error context:', errorData._error_context);
            // Don't display _error_context to the user
            const { _error_context, ...errors } = errorData;
            errorData = errors;
          }
          
          // Check for the new errors structure from the updated backend
          if (errorData && typeof errorData === 'object' && 'errors' in errorData) {
            console.log('New error structure detected with errors field:', errorData.errors);
            errorData = errorData.errors;
            
            // Log additional error information if available
            if ('error_type' in errorData) {
              console.log('Error type:', errorData.error_type);
            }
            if ('error_message' in errorData) {
              console.log('Error message:', errorData.error_message);
            }
          }
          
          if (typeof errorData === 'object' && errorData !== null) {
            // Log full error data to console for debugging
            console.group('Validation Error Details');
            console.log('Complete error data:', errorData);
            
            // Check for non-standard response types we might be handling
            if ('html_error' in errorData) {
              console.log('HTML error detected:', errorData.html_error);
            }
            if ('text_error' in errorData) {
              console.log('Plain text error detected');
            }
            console.groupEnd();
            
            // Check for the special 'detail' field which may contain a main error message
            if (errorData.detail && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
              // Use the detail field as the main error message
              errorMessage = errorData.detail[0];
              
              // If it's the only field (excluding our special _error_context, html_error, etc), don't format it as a list
              const userFacingFields = Object.keys(errorData).filter(key => 
                !key.startsWith('_') && !['html_error', 'text_error', 'error_type', 'error_details'].includes(key)
              );
              
              if (userFacingFields.length === 1 && userFacingFields[0] === 'detail') {
                setError(errorMessage);
                break;
              }
            }
            
            // Format the error message from DRF validation errors
            Object.entries(errorData).forEach(([field, messages]) => {
              // Skip internal fields
              if (field.startsWith('_') || ['html_error', 'text_error', 'error_type', 'error_details'].includes(field)) {
                return;
              }
              
              // Format field name for display (e.g., 'featured_image' -> 'Featured Image')
              const displayField = field
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
              // Handle array of error messages for each field
              if (Array.isArray(messages)) {
                errorMessage += `\n- ${displayField}: ${messages.join(', ')}`;
              } else {
                errorMessage += `\n- ${displayField}: ${messages}`;
              }
            });
          } else if (typeof errorData === 'string') {
            // Handle case where the error is just a string
            errorMessage += `\n${errorData}`;
          } else {
            errorMessage += '\nInvalid form data';
            console.error('Unrecognized error format:', errorData);
          }
          
          setError(errorMessage);
          break;
        }
        
        case 401:
        case 403: {
          // Authentication/authorization errors
          setError('Authentication failed. Please login again to continue.');
          console.error('Auth error:', response.data);
          
          // Clear invalid tokens using helper functions from our api service
          if (typeof window !== 'undefined') {
            // Use the same functions as in our api service
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('refreshToken');
            
            // Update auth context if possible
            // (this happens automatically on next render)
          }
          
          // Redirect to login
          setTimeout(() => {
            router.push('/auth/login?expired=true&redirect=/posts/new');
          }, 2000);
          break;
        }
        
        case 500: {
          // Server errors
          console.group('Server Error (500)');
          console.error('Server error response:', response.data);
          
          // Check if we have any details from our enhanced error handler
          let errorMessage = 'Server error: The server encountered a problem processing your request.';
          let errorDetails = [];
          
          // Check the response format
          if (response.data && typeof response.data === 'object') {
            // Check for our special _error_context property for debugging
            if ('_error_context' in response.data) {
              console.log('Error context:', response.data._error_context);
              
              // Log additional context info if available
              if (response.data._error_context.responseSnippet) {
                console.log('Response snippet:', response.data._error_context.responseSnippet);
              }
              if (response.data._error_context.contentType) {
                console.log('Content type:', response.data._error_context.contentType);
              }
            }
            
            // Check for error_type and error_details from our improved backend
            if ('error_type' in response.data) {
              console.log('Error type:', response.data.error_type);
              errorDetails.push(`Error type: ${response.data.error_type}`);
            }
            
            if ('error_details' in response.data) {
              console.log('Error details:', response.data.error_details);
              errorDetails.push(response.data.error_details);
            }
            
            // Use detail field if available
            if (response.data.detail) {
              if (Array.isArray(response.data.detail) && response.data.detail.length > 0) {
                errorMessage = response.data.detail[0];
              } else if (typeof response.data.detail === 'string') {
                errorMessage = response.data.detail;
              }
            }
            
            // Check for HTML or text error messages
            if ('html_error' in response.data) {
              console.log('HTML error:', response.data.html_error);
              errorMessage = `Server error: ${response.data.html_error}`;
            }
          }
          console.groupEnd();
          
          // If we still have a generic message, provide more specific guidance for image uploads
          if (errorMessage.includes('server encountered a problem') && featuredImage) {
            errorMessage = `Server error: There was a problem processing your image.
            
This might be due to:
- Image format (only JPEG, PNG, GIF, and WebP are supported)
- Image size (must be under 5MB)
- Image corruption or invalid file structure
            
Please try:
1. Using a different image file
2. Converting your image to a different format
3. Reducing the image size or dimensions`;
          }
          
          // Include error details if we have them
          if (errorDetails.length > 0) {
            errorMessage += '\n\nTechnical details:\n' + errorDetails.join('\n');
          }
          
          setError(errorMessage);
          break;
        }
        
        case 0: {
          // Network errors (no response)
          console.error('Network error details:', response.data);
          
          // Check for enhanced error details
          if (response.data && typeof response.data === 'object') {
            // Log request ID if available for tracing in logs
            if (response.data.requestId) {
              console.log(`Error request ID: ${response.data.requestId}`);
            }
            
            // Display specific message if available
            if (response.data.detail && Array.isArray(response.data.detail) && response.data.detail.length > 0) {
              setError(response.data.detail[0]);
              break;
            }
            
            // Display message field if available
            if (response.data.message) {
              let errorMsg = `Network error: ${response.data.message}`;
              if (response.data.code) {
                errorMsg += ` (Code: ${response.data.code})`;
              }
              setError(errorMsg);
              break;
            }
          }
          
          // Fallback message
          setError('Network error: Could not connect to the server. Please check your internet connection and try again.');
          break;
        }
        
        default: {
          // Other error codes
          setError(`Error (${response.status}): ${JSON.stringify(response.data) || 'Unknown error'}`);
          console.error(`Unhandled error status ${response.status}:`, response.data);
        }
      }
    } catch (err: any) {
      // This shouldn't happen often since we're handling errors in the API service
      console.error('Unexpected error in form submission:', err);
      
      setError(
        'An unexpected error occurred. Please try again or contact support if the problem persists.'
      );
      
      // Log additional details if available
      if (err.message) {
        console.error('Error message:', err.message);
      }
      
      if (err.stack) {
        console.error('Error stack:', err.stack);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (pageLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Container className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h1 className="h3 mb-0">Create New Post</h1>
            </Card.Header>
            
            <Card.Body>
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                {/* Title Field */}
                <Form.Group className="mb-3" controlId="postTitle">
                  <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title"
                    required
                    minLength={3}
                    maxLength={100}
                    isInvalid={title.trim().length === 0}
                  />
                  <Form.Control.Feedback type="invalid">
                    Title is required
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Title must be between 3 and 100 characters
                  </Form.Text>
                </Form.Group>
                
                {/* Content Field */}
                <Form.Group className="mb-3" controlId="postContent">
                  <Form.Label>Content <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your post content here..."
                    required
                    isInvalid={content.trim().length === 0}
                  />
                  <Form.Control.Feedback type="invalid">
                    Content is required
                  </Form.Control.Feedback>
                </Form.Group>
                
                {/* Tags Field */}
                <Form.Group className="mb-3" controlId="postTags">
                  <Form.Label>Tags</Form.Label>
                  <Form.Control
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    onBlur={validateTags}
                    placeholder="Enter tags separated by commas (e.g. tech, programming, web)"
                    isInvalid={!!tagsError}
                  />
                  <Form.Control.Feedback type="invalid">
                    {tagsError}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Optional. Add up to 10 tags, each tag 50 characters or less.
                  </Form.Text>
                </Form.Group>
                
                {/* Image Upload Field */}
                <Form.Group className="mb-4" controlId="postImage">
                  <Form.Label>Featured Image</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                  />
                  <Form.Text className="text-muted">
                    Optional. Maximum size: 5MB. Supported formats: JPEG, PNG, GIF, WebP.
                  </Form.Text>
                  
                  {imagePreview && (
                    <div className="mt-3 text-center">
                      <p>Image Preview:</p>
                      <div 
                        className="position-relative rounded overflow-hidden mx-auto" 
                        style={{ 
                          width: '100%', 
                          maxWidth: '300px',
                          height: '200px'
                        }}
                      >
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Form.Group>
                
                {/* Submit Button */}
                <div className="d-grid gap-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Creating Post...' : 'Create Post'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

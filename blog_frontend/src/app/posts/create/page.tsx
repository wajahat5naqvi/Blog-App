'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Form, Button, Alert, Row, Col, Card } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import { postService, categoryService, tagService } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';

// Import Quill dynamically to avoid SSR issues
const QuillEditor = dynamic(() => import('../../components/EditorWrapper'), { 
  ssr: false,
  loading: () => <div className="loading-editor">Loading editor...</div>
});

// Custom styles imported instead of direct react-quill CSS
import '../../styles/quill-editor.css';

export default function PostCreate() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [published, setPublished] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [publishAt, setPublishAt] = useState<string>('');
  const [useScheduling, setUseScheduling] = useState(false);
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quill editor modules and formats
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }]
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'image',
    'color', 'background',
    'align'
  ];

  useEffect(() => {
    // Fetch categories and tags when component mounts
    const fetchData = async () => {
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          categoryService.getAllCategories(),
          tagService.getAllTags()
        ]);
        
        setCategories(categoriesResponse.data);
        setTags(tagsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load categories or tags. Please try again later.');
      }
    };

    fetchData();
  }, []);

  // Handle file change for featured image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeaturedImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Handle tag selection
  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions, 
      option => option.value
    );
    setSelectedTags(selectedOptions);
  };

  // Generate excerpt from content if not provided manually
  const generateExcerpt = (content: string) => {
    if (!content) return '';
    
    // Strip HTML tags
    const strippedContent = content.replace(/<[^>]+>/g, ' ');
    
    // Take first 150 characters
    return strippedContent.substring(0, 150) + (strippedContent.length > 150 ? '...' : '');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create FormData object for multipart/form-data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      
      // Add excerpt if provided, otherwise generate from content
      const finalExcerpt = excerpt || generateExcerpt(content);
      formData.append('excerpt', finalExcerpt);
      
      // Add tags - we need to handle this specially since it's an array
      selectedTags.forEach(tag => {
        formData.append('tags', tag);
      });
      
      // Add category if selected
      if (categoryId) {
        formData.append('category_id', categoryId);
      }
      
      // Add featured image if selected
      if (featuredImage) {
        formData.append('featured_image', featuredImage);
      }
      
      // Add publishing status
      formData.append('published', published.toString());
      formData.append('is_draft', isDraft.toString());
      
      // Add scheduled publishing date if specified
      if (useScheduling && publishAt) {
        formData.append('publish_at', publishAt);
      }
      
      // Send the form data to the API
      await postService.createPost(formData);
      
      setSuccess(true);
      
      // Redirect to posts list after short delay
      setTimeout(() => {
        router.push('/posts');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating post:', err);
      
      if (err.response && err.response.data) {
        // Format error messages from API response
        const errorData = err.response.data;
        if (errorData.errors) {
          // Join all error messages
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
          
          setError(errorMessages);
        } else {
          setError('An error occurred while creating the post. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Reset the form
  const handleReset = () => {
    setTitle('');
    setContent('');
    setExcerpt('');
    setSelectedTags([]);
    setCategoryId('');
    setFeaturedImage(null);
    setImagePreview('');
    setPublished(true);
    setIsDraft(false);
    setPublishAt('');
    setUseScheduling(false);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Create New Post</h1>
      
      {/* Error Alert */}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      {/* Success Alert */}
      {success && (
        <Alert variant="success" className="mb-4">
          Post created successfully! Redirecting...
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Row>
          {/* Left Column - Main Form */}
          <Col md={8}>
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                {/* Title */}
                <Form.Group className="mb-4" controlId="postTitle">
                  <Form.Label>Post Title</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Form.Group>
                
                {/* Content Editor */}
                <Form.Group className="mb-4" controlId="postContent">
                  <Form.Label>Content</Form.Label>
                  <div className="rich-text-editor-container" style={{ minHeight: '350px' }}>
                    {/* Only render React Quill on the client side */}
                    {typeof window !== 'undefined' && (
                      <QuillEditor
                        theme="snow"
                        value={content}
                        onChange={setContent}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Write your post content here..."
                        className="rich-text-editor"
                        style={{ height: '300px', marginBottom: '60px' }}
                      />
                    )}
                  </div>
                </Form.Group>
                
                {/* Excerpt */}
                <Form.Group className="mb-4" controlId="postExcerpt">
                  <Form.Label>
                    Excerpt <small className="text-muted">(Optional - will be generated from content if left empty)</small>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Brief summary of your post"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    maxLength={150}
                  />
                  <Form.Text className="text-muted">
                    Maximum 150 characters. {excerpt.length}/150
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Right Column - Post Settings */}
          <Col md={4}>
            {/* Featured Image */}
            <Card className="mb-4 shadow-sm">
              <Card.Header>Featured Image</Card.Header>
              <Card.Body>
                {imagePreview && (
                  <div className="mb-3 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="img-fluid rounded mb-2" 
                      style={{ maxHeight: '200px' }} 
                    />
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => {
                        setFeaturedImage(null);
                        setImagePreview('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
                
                <Form.Group controlId="featuredImage">
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  <Form.Text className="text-muted">
                    Max file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
            
            {/* Category */}
            <Card className="mb-4 shadow-sm">
              <Card.Header>Category</Card.Header>
              <Card.Body>
                <Form.Group controlId="postCategory">
                  <Form.Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
            
            {/* Tags */}
            <Card className="mb-4 shadow-sm">
              <Card.Header>Tags</Card.Header>
              <Card.Body>
                <Form.Group controlId="postTags">
                  <Form.Select 
                    multiple 
                    value={selectedTags}
                    onChange={handleTagChange}
                    style={{ height: '150px' }}
                  >
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Hold Ctrl (Cmd on Mac) to select multiple tags
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
            
            {/* Publishing Options */}
            <Card className="mb-4 shadow-sm">
              <Card.Header>Publishing Options</Card.Header>
              <Card.Body>
                {/* Draft Mode */}
                <Form.Check
                  type="switch"
                  id="draftSwitch"
                  label="Save as Draft"
                  checked={isDraft}
                  onChange={(e) => {
                    setIsDraft(e.target.checked);
                    if (e.target.checked) {
                      setPublished(false); // Drafts are not published
                      setUseScheduling(false); // Drafts can't be scheduled
                    }
                  }}
                  className="mb-3"
                />
                
                {/* Scheduling */}
                <Form.Check
                  type="switch"
                  id="scheduleSwitch"
                  label="Schedule Publication"
                  checked={useScheduling}
                  onChange={(e) => {
                    setUseScheduling(e.target.checked);
                    if (e.target.checked) {
                      setIsDraft(false); // Scheduled posts are not drafts
                    }
                  }}
                  className="mb-2"
                  disabled={isDraft}
                />
                
                {useScheduling && (
                  <Form.Group className="mb-3">
                    <Form.Label>Publication Date and Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)} // Only allow future dates
                      required={useScheduling}
                    />
                    <Form.Text className="text-muted">
                      Select when to publish your post
                    </Form.Text>
                  </Form.Group>
                )}
                
                {/* Immediate Publication */}
                <Form.Check
                  type="switch"
                  id="publishedSwitch"
                  label="Publish Immediately"
                  checked={published && !isDraft && !useScheduling}
                  onChange={(e) => {
                    setPublished(e.target.checked);
                    if (e.target.checked) {
                      setIsDraft(false); // Published posts are not drafts
                      setUseScheduling(false); // Published posts are not scheduled
                    }
                  }}
                  className="mb-4"
                  disabled={isDraft || useScheduling}
                />
              
                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {isDraft ? 'Saving Draft...' : useScheduling ? 'Scheduling...' : 'Publishing...'}
                      </>
                    ) : (
                      isDraft ? 'Save Draft' : useScheduling ? 'Schedule Post' : 'Publish Post'
                    )}
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    type="button"
                    onClick={handleReset}
                  >
                    Reset Form
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </Container>
  );
}
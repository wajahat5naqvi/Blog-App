'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Image from 'next/image';
import { getImageUrl, handleImageError } from '../utils/imageUtils';

interface Profile {
  user: {
    id: number;
    username: string;
    email: string;
  };
  bio: string;
  profile_image: string | null;
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Update state
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await profileService.getProfile();
        const profileData = response.data;
        
        console.log("Profile data from API:", profileData);
        
        // Create a compatible profile object based on what's available in the response
        const adaptedProfile: Profile = {
          user: {
            id: user?.id || 0,
            username: profileData?.username || user?.username || '',
            email: profileData?.email || user?.email || '',
          },
          bio: profileData?.bio || '',
          profile_image: profileData?.profile_picture || null,
        };
        
        setProfile(adaptedProfile);
        
        // Initialize form values
        setUsername(adaptedProfile.user.username);
        setEmail(adaptedProfile.user.email);
        setBio(adaptedProfile.bio || '');
        
        if (adaptedProfile.profile_image) {
          setImagePreview(adaptedProfile.profile_image);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess(false);
    setUpdateError(null);
    
    try {
      const formData = new FormData();
      // Using field names that match the backend serializer
      formData.append('email', email);
      formData.append('bio', bio);
      
      if (profileImage) {
        // Make sure we use the correct field name from the serializer
        formData.append('profile_picture', profileImage);
      }
      
      const response = await profileService.updateProfile(formData);
      console.log("Profile update response:", response.data);
      
      // Update our adapted profile with the new data
      const updatedProfileData = response.data;
      const adaptedProfile: Profile = {
        user: {
          id: user?.id || 0,
          username: updatedProfileData?.username || username,
          email: updatedProfileData?.email || email,
        },
        bio: updatedProfileData?.bio || bio,
        profile_image: updatedProfileData?.profile_picture || null,
      };
      
      setProfile(adaptedProfile);
      setUpdateSuccess(true);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setUpdateError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Authentication Required</Alert.Heading>
          <p>Please sign in to view and manage your profile.</p>
        </Alert>
      </Container>
    );
  }

  if (error || !profile) {
    return <ErrorAlert message="Error loading profile" details={error || 'Profile data not available'} />;
  }

  return (
    <Container className="py-4">
      <Row>
        <Col lg={10} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h1 className="h3 mb-0">My Profile</h1>
            </Card.Header>
            
            <Card.Body>
              <Tab.Container defaultActiveKey="profile">
                <Row>
                  <Col md={3} className="mb-4 mb-md-0">
                    <div className="text-center mb-4">
                      <div className="position-relative mx-auto" style={{ width: '150px', height: '150px' }}>
                        {imagePreview ? (
                          <Image 
                            src={imagePreview.startsWith('data:') ? imagePreview : getImageUrl(imagePreview) || '/default-avatar.jpg'} 
                            alt={username || 'Profile'}
                            fill
                            className="rounded-circle"
                            style={{ objectFit: 'cover' }}
                            onError={handleImageError}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                            style={{ width: '150px', height: '150px', fontSize: '4rem' }}
                          >
                            {username && username.length > 0 ? username.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <h4 className="mt-3">{profile.user && profile.user.username ? profile.user.username : 'User'}</h4>
                    </div>
                    
                    <Nav variant="pills" className="flex-column">
                      <Nav.Item>
                        <Nav.Link eventKey="profile">Profile Information</Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="account">Account Settings</Nav.Link>
                      </Nav.Item>
                    </Nav>
                  </Col>
                  
                  <Col md={9}>
                    <Tab.Content>
                      <Tab.Pane eventKey="profile">
                        {updateSuccess && (
                          <Alert variant="success" dismissible onClose={() => setUpdateSuccess(false)}>
                            Profile updated successfully!
                          </Alert>
                        )}
                        
                        {updateError && (
                          <Alert variant="danger" dismissible onClose={() => setUpdateError(null)}>
                            {updateError}
                          </Alert>
                        )}
                        
                        <Form onSubmit={handleSubmit}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3" controlId="username">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                  type="text"
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  required
                                />
                              </Form.Group>
                            </Col>
                            
                            <Col md={6}>
                              <Form.Group className="mb-3" controlId="email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Form.Group className="mb-3" controlId="bio">
                            <Form.Label>Bio</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Tell us about yourself..."
                            />
                          </Form.Group>
                          
                          <Form.Group className="mb-4" controlId="profileImage">
                            <Form.Label>Profile Image</Form.Label>
                            <Form.Control
                              type="file"
                              onChange={handleImageChange}
                              accept="image/*"
                            />
                            <Form.Text className="text-muted">
                              Upload a new profile image (optional)
                            </Form.Text>
                          </Form.Group>
                          
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={updating}
                          >
                            {updating ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </Form>
                      </Tab.Pane>
                      
                      <Tab.Pane eventKey="account">
                        <Card className="mb-4">
                          <Card.Body>
                            <h5>Change Password</h5>
                            <p className="text-muted">Update your password to keep your account secure.</p>
                            <Button variant="outline-primary">Change Password</Button>
                          </Card.Body>
                        </Card>
                        
                        <Card className="border-danger">
                          <Card.Body>
                            <h5 className="text-danger">Delete Account</h5>
                            <p className="text-muted">
                              Permanently delete your account and all associated data.
                              This action cannot be undone.
                            </p>
                            <Button variant="danger">Delete Account</Button>
                          </Card.Body>
                        </Card>
                      </Tab.Pane>
                    </Tab.Content>
                  </Col>
                </Row>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
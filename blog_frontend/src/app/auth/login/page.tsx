'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { safeLocalStorage } from '../../utils/clientUtils';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Login API request
      const response = await authService.login(username, password);
      
      // Get the tokens from the response
      const { access, refresh } = response.data;
      
      // Store refresh token using safe method
      safeLocalStorage.setItem('refreshToken', refresh);

      // Get user info
      // In a real application, you might want to make another request to get user details
      // or decode the JWT token to get user info
      const userInfo = { 
        id: 1, // This should come from the API or token
        username, 
        email: '' // This should come from the API or token
      };
      
      // Call the login method from AuthContext
      login(access, userInfo);
      
      // Redirect to home page
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h1 className="text-center mb-4">Login</h1>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formUsername">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mt-3"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>
              
              <div className="mt-3 text-center">
                <p>Don't have an account? <Link href="/auth/register">Register</Link></p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
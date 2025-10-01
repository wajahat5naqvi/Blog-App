'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

const Header = () => {
  // Add client-side only rendering to prevent hydration mismatches
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();
  
  // Only render client-specific content after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // This ensures that during SSR, we render a simplified version
  // Once mounted on client, we render the full interactive version
  if (!mounted) {
    return (
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="/">Blog App</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-nav" />
        </Container>
      </Navbar>
    );
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} href="/">Blog App</Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav" className="justify-content-between">
          <Nav className="me-auto">
            <Nav.Link as={Link} href="/">Home</Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} href="/posts/create">Create Post</Nav.Link>
                <Nav.Link as={Link} href="/profile">My Profile</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <>
                <span className="navbar-text me-3">
                  Welcome, {user?.username}
                </span>
                <Button variant="outline-light" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} href="/auth/login">Login</Nav.Link>
                <Nav.Link as={Link} href="/auth/register">Register</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
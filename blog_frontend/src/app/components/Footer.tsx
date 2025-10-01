'use client';

import { Container } from 'react-bootstrap';
import { useCurrentYear } from '../utils/clientUtils';

const Footer = () => {
  // Using our safe client-side hook for the current year
  const year = useCurrentYear("2025");
  
  return (
    <footer className="bg-dark text-white py-4 mt-5">
      <Container className="text-center">
        <p className="mb-0">© {year} Blog App. All rights reserved.</p>
        <p className="small">Built with Next.js and Django REST Framework</p>
      </Container>
    </footer>
  );
};

export default Footer;
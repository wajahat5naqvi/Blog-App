'use client';

import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
      <div className="text-center">
        <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">{message}</div>
      </div>
    </Container>
  );
};

export default LoadingSpinner;
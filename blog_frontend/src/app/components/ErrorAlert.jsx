'use client';

import React from 'react';
import { Alert } from 'react-bootstrap';

const ErrorAlert = ({ message = 'An error occurred', details = null }) => {
  return (
    <Alert variant="danger">
      <Alert.Heading>{message}</Alert.Heading>
      {details && (
        <p className="mb-0">
          {typeof details === 'string' 
            ? details 
            : Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
        </p>
      )}
    </Alert>
  );
};

export default ErrorAlert;
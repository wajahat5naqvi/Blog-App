'use client';

import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner = ({ message = 'Loading...' }: LoadingSpinnerProps) => {
  return (
    <div className="text-center py-5">
      <Spinner animation="border" role="status" variant="primary" />
      <p className="mt-2">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
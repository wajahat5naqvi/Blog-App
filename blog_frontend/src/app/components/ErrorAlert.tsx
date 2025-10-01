'use client';

import { Alert } from 'react-bootstrap';

interface ErrorAlertProps {
  message: string;
  details?: string;
}

const ErrorAlert = ({ message, details }: ErrorAlertProps) => {
  return (
    <Alert variant="danger">
      <Alert.Heading>{message}</Alert.Heading>
      {details && <p className="mb-0">{details}</p>}
    </Alert>
  );
};

export default ErrorAlert;
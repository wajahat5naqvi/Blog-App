'use client';

import { Alert, Button } from 'react-bootstrap';

interface ErrorAlertProps {
  message: string;
  details?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

const ErrorAlert = ({ message, details, onRetry, onBack }: ErrorAlertProps) => {
  return (
    <Alert variant="danger">
      <Alert.Heading>{message}</Alert.Heading>
      {details && <p className="mb-0">{details}</p>}
      
      {(onRetry || onBack) && (
        <div className="d-flex gap-2 mt-3">
          {onRetry && (
            <Button variant="outline-danger" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant="outline-secondary" size="sm" onClick={onBack}>
              Go Back
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
};

export default ErrorAlert;
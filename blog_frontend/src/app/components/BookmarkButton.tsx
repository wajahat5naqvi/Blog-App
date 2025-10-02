import React, { useState } from 'react';
import { Bookmark, BookmarkFill } from 'react-bootstrap-icons';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { api, authService } from '../services/api';
import styles from './BookmarkButton.module.css';

interface BookmarkButtonProps {
  postId: number;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'icon';
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ 
  postId, 
  isBookmarked: initialIsBookmarked = false, 
  onBookmarkChange,
  size = 'md',
  variant = 'icon'
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = authService;
  
  // Icon sizes based on the size prop
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };
  
  const handleToggleBookmark = async () => {
    if (!isAuthenticated()) {
      // Redirect to login or show login modal
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isBookmarked) {
        // Remove bookmark
        await api.delete(`/posts/${postId}/unbookmark/`);
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await api.post(`/posts/${postId}/bookmark/`);
        setIsBookmarked(true);
      }
      
      // Call the onBookmarkChange callback if provided
      if (onBookmarkChange) {
        onBookmarkChange(!isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const tooltipText = isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks';
  
  if (variant === 'icon') {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`bookmark-tooltip-${postId}`}>{tooltipText}</Tooltip>}
      >
        <button 
          className={styles.iconButton}
          onClick={handleToggleBookmark}
          disabled={isLoading}
          aria-label={tooltipText}
        >
          {isBookmarked ? (
            <BookmarkFill size={iconSizes[size]} className={styles.bookmarkedIcon} />
          ) : (
            <Bookmark size={iconSizes[size]} />
          )}
        </button>
      </OverlayTrigger>
    );
  }
  
  // Outline variant
  return (
    <Button
      variant={isBookmarked ? 'primary' : 'outline-primary'}
      size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : undefined}
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={styles.outlineButton}
    >
      {isBookmarked ? (
        <>
          <BookmarkFill size={iconSizes[size]} className="me-1" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark size={iconSizes[size]} className="me-1" />
          Bookmark
        </>
      )}
    </Button>
  );
};

export default BookmarkButton;
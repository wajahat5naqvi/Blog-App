'use client';

/**
 * Utility function to handle image URLs in Next.js
 * This ensures all image URLs from the backend are properly formatted for next/image
 * 
 * @param {string | null} imageUrl - The image URL from the backend
 * @returns {string | null} - The formatted image URL or null
 */
export function getImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  // If it's already a full URL, return it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it's a relative URL, prepend the backend URL
  if (imageUrl.startsWith('/')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${imageUrl}`;
  }

  // Default case: assume it's a partial path and needs the backend URL
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/${imageUrl}`;
}

/**
 * Utility function to handle image loading errors
 * 
 * @param {React.SyntheticEvent<HTMLImageElement, Event>} e - The error event
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  console.error('Image loading error:', e);
  // Set a fallback image
  (e.target as HTMLImageElement).src = '/default-image.jpg';
  // Remove the srcset to prevent further loading attempts
  (e.target as HTMLImageElement).srcset = '';
}
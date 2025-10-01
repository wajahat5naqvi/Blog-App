'use client';

import Link from 'next/link';
import { Card, Badge } from 'react-bootstrap';
import Image from 'next/image';
import FormattedDate from './FormattedDate';
import { getImageUrl, handleImageError } from '../utils/imageUtils';

interface Tag {
  id: number;
  name: string;
}

interface Author {
  id: number;
  username: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  featured_image: string | null;
  tags: Tag[];
  author: Author;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const { id, title, content, featured_image, author, created_at, tags } = post;
  
  // Truncate content for card preview
  const truncatedContent = content.length > 150 
    ? `${content.substring(0, 150)}...` 
    : content;

  return (
    <Card className="mb-4 h-100 shadow-sm">
      {featured_image && (
        <div style={{ height: '200px', position: 'relative' }}>
          <Image
            src={getImageUrl(featured_image) || '/default-image.jpg'}
            alt={title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3C/svg%3E"
            className="card-img-top"
            onError={handleImageError}
          />
        </div>
      )}
      <Card.Body>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          By {author.username} on <FormattedDate dateString={created_at} />
        </Card.Subtitle>
        <div className="mb-2">
          {tags.map(tag => (
            <Badge bg="secondary" key={tag.id} className="me-1">{tag.name}</Badge>
          ))}
        </div>
        <Card.Text>{truncatedContent}</Card.Text>
        <Link href={`/posts/${id}`} className="btn btn-primary">Read More</Link>
      </Card.Body>
    </Card>
  );
};

export default PostCard;
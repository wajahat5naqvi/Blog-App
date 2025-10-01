'use client';

import { useState } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/api';
import FormattedDate from './FormattedDate';

interface Author {
  id: number;
  username: string;
}

export interface CommentType {
  id: number;
  content: string;
  author: Author;
  created_at: string;
  replies: CommentType[];
  parent: number | null;
  post: number;
  likes_count: number;
  is_liked: boolean;
}

interface CommentProps {
  comment: CommentType;
  postId: string;
  onNewReply?: (comment: CommentType) => void;
}

const Comment = ({ comment, postId, onNewReply }: CommentProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await postService.addComment(postId, replyContent, String(comment.id));
      if (onNewReply) {
        onNewReply(response.data);
      }
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // We'll use our FormattedDate component instead of calculating date here

  return (
    <Card className="mb-2">
      <Card.Body>
        <Card.Subtitle className="mb-2 d-flex justify-content-between">
          <span className="fw-bold">{comment.author.username}</span>
          <small className="text-muted"><FormattedDate dateString={comment.created_at} /></small>
        </Card.Subtitle>
        <Card.Text>{comment.content}</Card.Text>
        {isAuthenticated && (
          <Button 
            variant="link" 
            className="p-0 text-decoration-none" 
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            {showReplyForm ? 'Cancel' : 'Reply'}
          </Button>
        )}
        
        {showReplyForm && (
          <Form onSubmit={handleReplySubmit} className="mt-3">
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                required
              />
            </Form.Group>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Reply'}
            </Button>
          </Form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="ms-4 mt-3">
            {comment.replies.map((reply) => (
              <Comment 
                key={reply.id} 
                comment={reply} 
                postId={postId}
                onNewReply={onNewReply}
              />
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default Comment;
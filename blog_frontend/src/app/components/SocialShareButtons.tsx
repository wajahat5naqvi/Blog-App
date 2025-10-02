import React from 'react';
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Pinterest, 
  Whatsapp, 
  Link as LinkIcon 
} from 'react-bootstrap-icons';
import styles from './SocialShareButtons.module.css';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  variant?: 'horizontal' | 'vertical' | 'icons';
  size?: 'sm' | 'md' | 'lg';
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ 
  url, 
  title, 
  description = '',
  image = '',
  variant = 'horizontal',
  size = 'md'
}) => {
  // For copy to clipboard functionality
  const copyToClipboard = () => {
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };

  // Encode parameters for share URLs
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedImage = encodeURIComponent(image);

  // Share URLs for different platforms
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedTitle}`;
  const whatsappUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
  
  // Icon sizes based on the size prop
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };
  
  // Get the right container class based on the variant
  const containerClass = variant === 'vertical' 
    ? styles.verticalContainer 
    : variant === 'icons' 
      ? styles.iconsContainer 
      : styles.horizontalContainer;
  
  return (
    <div className={`${styles.shareContainer} ${containerClass} ${styles[size]}`}>
      {variant !== 'icons' && <span className={styles.shareText}>Share:</span>}
      
      <a 
        href={facebookUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`${styles.shareButton} ${styles.facebook}`}
        aria-label="Share on Facebook"
      >
        <Facebook size={iconSizes[size]} />
        {variant !== 'icons' && <span>Facebook</span>}
      </a>
      
      <a 
        href={twitterUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`${styles.shareButton} ${styles.twitter}`}
        aria-label="Share on Twitter"
      >
        <Twitter size={iconSizes[size]} />
        {variant !== 'icons' && <span>Twitter</span>}
      </a>
      
      <a 
        href={linkedinUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`${styles.shareButton} ${styles.linkedin}`}
        aria-label="Share on LinkedIn"
      >
        <Linkedin size={iconSizes[size]} />
        {variant !== 'icons' && <span>LinkedIn</span>}
      </a>
      
      {image && (
        <a 
          href={pinterestUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${styles.shareButton} ${styles.pinterest}`}
          aria-label="Share on Pinterest"
        >
          <Pinterest size={iconSizes[size]} />
          {variant !== 'icons' && <span>Pinterest</span>}
        </a>
      )}
      
      <a 
        href={whatsappUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`${styles.shareButton} ${styles.whatsapp}`}
        aria-label="Share on WhatsApp"
      >
        <Whatsapp size={iconSizes[size]} />
        {variant !== 'icons' && <span>WhatsApp</span>}
      </a>
      
      <button 
        onClick={copyToClipboard} 
        className={`${styles.shareButton} ${styles.copyLink}`}
        aria-label="Copy link"
      >
        <LinkIcon size={iconSizes[size]} />
        {variant !== 'icons' && <span>Copy Link</span>}
      </button>
    </div>
  );
};

export default SocialShareButtons;
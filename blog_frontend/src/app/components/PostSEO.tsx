'use client';

import React from 'react';
import Head from 'next/head';

interface PostSEOProps {
  title: string;
  description: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  image?: string;
  url?: string;
  tags?: string[];
  category?: string;
}

const PostSEO: React.FC<PostSEOProps> = ({ 
  title,
  description,
  author,
  publishedTime,
  modifiedTime,
  image,
  url,
  tags,
  category
}) => {
  // Format title
  const siteTitle = 'Blog App';
  const fullTitle = `${title} | ${siteTitle}`;
  
  // Format description - limit to ~155 characters for search engines
  const metaDescription = description.length > 155 
    ? `${description.substring(0, 152)}...` 
    : description;
  
  // Format URL
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Meta Tags (Facebook, LinkedIn) */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={siteTitle} />
      {image && <meta property="og:image" content={image} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {category && <meta property="article:section" content={category} />}
      {tags && tags.map((tag, i) => (
        <meta property="article:tag" content={tag} key={i} />
      ))}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={metaDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {author && <meta name="twitter:creator" content={author} />}
      
      {/* Article Meta Tags */}
      {author && <meta name="author" content={author} />}
    </Head>
  );
};

export default PostSEO;
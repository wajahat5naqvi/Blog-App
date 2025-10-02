'use client';

import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="posts-layout">
      {children}
    </div>
  );
}
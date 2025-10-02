import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'react-bootstrap-icons';
import styles from './DarkModeToggle.module.css';

interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  position?: 'navbar' | 'sidebar' | 'floating';
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  size = 'md', 
  position = 'navbar' 
}) => {
  // State to track current theme
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme preference from localStorage on component mount
  useEffect(() => {
    // Check if we have a saved preference
    const savedTheme = localStorage.getItem('theme');
    
    // If we have a saved preference, use it
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    } 
    // Otherwise, check system preference
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Determine icon size based on the size prop
  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  }[size];

  // Get the appropriate position class
  const positionClass = {
    navbar: styles.navbarPosition,
    sidebar: styles.sidebarPosition,
    floating: styles.floatingPosition
  }[position];

  return (
    <button 
      onClick={toggleTheme} 
      className={`${styles.toggleButton} ${styles[size]} ${positionClass}`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun size={iconSize} className={styles.icon} />
      ) : (
        <Moon size={iconSize} className={styles.icon} />
      )}
      <span className={styles.label}>
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
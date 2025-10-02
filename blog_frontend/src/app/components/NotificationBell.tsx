import React, { useState } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { Bell } from 'react-bootstrap-icons';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../context/NotificationContext';
import styles from './NotificationBell.module.css';

type Notification = {
  id: number;
  message: string;
  notification_type: string;
  created_at: string;
  read: boolean;
  redirect_url: string;
  sender_username: string | null;
  sender_profile_picture: string | null;
};

export default function NotificationBell() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Close dropdown
    setShow(false);
    
    // Navigate to the redirect URL if provided
    if (notification.redirect_url) {
      router.push(notification.redirect_url);
    }
  };
  
  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
  };
  
  // Format the notification time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Calculate the time difference in milliseconds
    const timeDiff = now.getTime() - date.getTime();
    
    // Convert to appropriate units
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };
  
  return (
    <Dropdown show={show} onToggle={setShow} align="end">
      <Dropdown.Toggle 
        as="div" 
        id="notification-dropdown"
        className={styles.notificationToggle}
      >
        <div className={styles.bellContainer}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              bg="danger" 
              pill 
              className={styles.notificationBadge}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </div>
      </Dropdown.Toggle>

      <Dropdown.Menu className={styles.notificationMenu}>
        <div className={styles.notificationHeader}>
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <button 
              className={styles.markAllRead} 
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
          )}
        </div>
        
        <div className={styles.notificationList}>
          {loading ? (
            <div className={styles.notificationItem}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.notificationItem}>No notifications</div>
          ) : (
            notifications.map((notification: Notification) => (
              <div 
                key={notification.id} 
                className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationContent}>
                  <div className={styles.message}>{notification.message}</div>
                  <div className={styles.meta}>
                    <span className={styles.time}>
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <Dropdown.Item 
          as="div"
          className={styles.viewAll}
          onClick={() => router.push('/notifications')}
        >
          View all notifications
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
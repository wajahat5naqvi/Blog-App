import { createContext, useContext, useState, useEffect } from 'react';
import { api, authService } from '../services/api';

// Create notification context
export const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, user } = authService.useAuthState();

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clean up socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    // Create WebSocket connection
    const newSocket = new WebSocket(`ws://${window.location.hostname}:8000/ws/notifications/${user.id}/`);

    newSocket.onopen = () => {
      console.log('WebSocket connection established');
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        // Add new notification to state
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newSocket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    setSocket(newSocket);

    // Clean up function
    return () => {
      newSocket.close();
    };
  }, [isAuthenticated, user]);

  // Load initial notifications
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      // Reset state if not authenticated
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await api.get('/notifications/');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/notifications/count/');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/read/${notificationId}/`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read/all/');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
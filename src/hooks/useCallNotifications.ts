import { useCallback, useEffect, useRef } from 'react';

export const useCallNotifications = () => {
  const notificationRef = useRef<Notification | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show incoming call notification
  const showIncomingCallNotification = useCallback(async (
    callerName: string,
    callerAvatar: string,
    isVideo: boolean,
    onAccept: () => void,
    onReject: () => void
  ) => {
    const hasPermission = await requestPermission();
    
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return;
    }

    // Close any existing notification
    if (notificationRef.current) {
      notificationRef.current.close();
    }

    // Create notification
    try {
      const notificationOptions: NotificationOptions = {
        body: isVideo ? 'Входящий видеозвонок' : 'Входящий звонок',
        icon: callerAvatar || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'incoming-call',
        requireInteraction: true,
        silent: false,
      };

      const notification = new Notification(`${callerName}`, notificationOptions);

      notification.onclick = () => {
        window.focus();
        onAccept();
        notification.close();
      };

      notification.onclose = () => {
        stopVibration();
      };

      notificationRef.current = notification;

      // Start vibration pattern for mobile devices
      startVibration();

      console.log('Incoming call notification shown');
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }, [requestPermission]);

  // Start vibration for mobile devices
  const startVibration = useCallback(() => {
    if (!('vibrate' in navigator)) {
      console.log('Vibration not supported');
      return;
    }

    // Vibrate immediately
    navigator.vibrate([200, 100, 200]);

    // Continue vibrating every 2 seconds
    vibrationIntervalRef.current = setInterval(() => {
      navigator.vibrate([200, 100, 200]);
    }, 2000);
  }, []);

  // Stop vibration
  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // Close notification
  const closeNotification = useCallback(() => {
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    stopVibration();
  }, [stopVibration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeNotification();
    };
  }, [closeNotification]);

  return {
    requestPermission,
    showIncomingCallNotification,
    closeNotification,
  };
};

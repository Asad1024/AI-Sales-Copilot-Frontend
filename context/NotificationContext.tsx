"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import NotificationDialog, { Notification, NotificationType } from "@/components/ui/NotificationDialog";

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      details?: string[];
      duration?: number;
      onClose?: () => void;
    }
  ) => void;
  showSuccess: (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => void;
  showError: (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => void;
  showWarning: (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => void;
  showInfo: (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      options?: {
        details?: string[];
        duration?: number;
        onClose?: () => void;
      }
    ) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const defaultDuration =
        type === "error" ? 7000 : type === "warning" ? 5500 : 4500;
      const duration =
        options?.duration === 0
          ? 0
          : options?.duration != null && options.duration > 0
          ? options.duration
          : defaultDuration;
      setNotification({
        id,
        type,
        title,
        message,
        details: options?.details,
        duration,
        onClose: options?.onClose,
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    if (notification?.onClose) {
      notification.onClose();
    }
    setNotification(null);
  }, [notification]);

  const showSuccess = useCallback(
    (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => {
      showNotification("success", title, message, options);
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => {
      showNotification("error", title, message, options);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => {
      showNotification("warning", title, message, options);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: { details?: string[]; duration?: number; onClose?: () => void }) => {
      showNotification("info", title, message, options);
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <NotificationDialog notification={notification} onClose={handleClose} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

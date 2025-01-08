import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext(null);

const NotificationItem = ({ notification, onDismiss }) => {
    return (
        <div className={`notification notification-${notification.type}`}>
            <div className="notification-content">
                <div className="notification-header">
                    <h4>{notification.title}</h4>
                    <button 
                        className="notification-close"
                        onClick={() => onDismiss(notification.id)}
                    >
                        ×
                    </button>
                </div>
                <p className="notification-message">{notification.message}</p>
            </div>
            <style jsx>{`
                .notification {
                    position: relative;
                    padding: 16px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    background: white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s ease-out;
                    max-width: 360px;
                    overflow: hidden;
                }

                .notification-error {
                    border-left: 4px solid #ff4d4f;
                }

                .notification-content {
                    margin: 0;
                }

                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }

                .notification-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 500;
                    color: #1a1a1a;
                }

                .notification-message {
                    margin: 0;
                    font-size: 14px;
                    color: #666;
                }

                .notification-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    line-height: 1;
                    padding: 0 4px;
                    cursor: pointer;
                    color: #999;
                }

                .notification-close:hover {
                    color: #666;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = (type, title, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, title, message }]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            dismissNotification(id);
        }, 5000);
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    };

    const showError = (message, title = 'Error') => {
        showNotification('error', title, message);
    };

    return (
        <NotificationContext.Provider value={{ showError }}>
            {children}
            <div 
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 1000,
                }}
            >
                {notifications.map(notification => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onDismiss={dismissNotification}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

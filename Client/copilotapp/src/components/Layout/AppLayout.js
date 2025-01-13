import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, theme, Badge, List, Button } from 'antd';
import { 
    UserOutlined, 
    HomeOutlined, 
    AppstoreOutlined, 
    LogoutOutlined,
    BellOutlined 
} from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../utils/auth';
import api from '../../utils/api';
import ChatUiButton from '../../pages/ChatUiButton';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

const AppLayout = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const { token } = useToken();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const notificationService = api.notifications();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationService.getNotifications();
            if (response.success) {
                setNotifications(response.data);
            } else {
                console.error('Failed to fetch notifications:', response.message);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const headerStyle = {
        padding: '0 24px',
        background: token.colorBgElevated,
        borderBottom: `1px solid ${token.colorBorder}`,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    };

    const logoStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer'
    };

    const menuStyle = {
        background: 'transparent',
        border: 'none',
        flex: 1,
        justifyContent: 'center'
    };

    const profileStyle = {
        marginLeft: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: token.borderRadiusLG,
        transition: 'all 0.3s',
        '&:hover': {
            background: token.colorBgTextHover
        }
    };

    const notificationStyle = {
        padding: '16px',
        width: '300px',
        maxHeight: '400px',
        overflow: 'auto'
    };

    const markAsRead = async (id) => {
        try {
            const response = await notificationService.markNotificationAsRead(id);
            if (response.success) {
                setNotifications(notifications.map(notification => 
                    notification.id === id ? { ...notification, is_read: true } : notification
                ));
            } else {
                console.error('Failed to mark notification as read:', response.message);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await notificationService.markAllNotificationsAsRead();
            if (response.success) {
                setNotifications(notifications.map(notification => ({ ...notification, is_read: true })));
            } else {
                console.error('Failed to mark all notifications as read:', response.message);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const unreadCount = notifications.filter(notification => !notification.is_read).length;

    const notificationMenu = (
        <div style={notificationStyle}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
            }}>
                <Text strong>Notifications</Text>
                {unreadCount > 0 && (
                    <Button 
                        type="link" 
                        size="small" 
                        onClick={markAllAsRead}
                        loading={loading}
                        style={{ padding: 0 }}
                    >
                        Mark all as read
                    </Button>
                )}
            </div>
            <List
                loading={loading}
                dataSource={notifications}
                renderItem={item => (
                    <List.Item
                        style={{
                            background: item.is_read ? 'transparent' : token.colorBgTextHover,
                            padding: '8px',
                            borderRadius: token.borderRadiusLG,
                            cursor: 'pointer'
                        }}
                        onClick={() => markAsRead(item.id)}
                    >
                        <List.Item.Meta
                            title={item.title}
                            description={
                                <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {item.message}
                                    </Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        {new Date(item.created_at).toLocaleString()}
                                    </Text>
                                </div>
                            }
                        />
                        {!item.is_read && (
                            <Badge status="processing" />
                        )}
                    </List.Item>
                )}
            />
        </div>
    );

    const profileMenu = (
        <Menu 
            style={{ 
                minWidth: '150px',
                padding: '4px'
            }}
        >
            <Menu.Item key="profile" icon={<UserOutlined />}>
                <Link to="/profile">Profile</Link>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item 
                key="logout" 
                icon={<LogoutOutlined />} 
                onClick={logout}
                style={{ color: token.colorError }}
            >
                Logout
            </Menu.Item>
        </Menu>
    );

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
            <Header style={headerStyle}>
                <Link to="/" style={logoStyle}>
                    <Avatar 
                        size={40} 
                        src="/logo.png"
                        style={{ 
                            border: `2px solid ${token.colorPrimary}`,
                            padding: 2
                        }} 
                    />
                    <Title 
                        level={4} 
                        style={{ 
                            margin: 0,
                            color: token.colorText,
                            fontWeight: 600
                        }}
                    >
                        State Street
                    </Title>
                </Link>

                <Menu
                    mode="horizontal"
                    selectedKeys={[location.pathname]}
                    style={menuStyle}
                    items={[
                        {
                            key: '/',
                            icon: <HomeOutlined />,
                            label: <Link to="/">Home</Link>
                        },
                        {
                            key: '/dashboard',
                            icon: <AppstoreOutlined />,
                            label: <Link to="/dashboard">Dashboard</Link>
                        }
                    ]}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Dropdown 
                        overlay={notificationMenu}
                        placement="bottomRight"
                        arrow={{ pointAtCenter: true }}
                        trigger={['click']}
                    >
                        <Badge count={unreadCount} size="small">
                            <Avatar 
                                icon={<BellOutlined />} 
                                style={{ 
                                    backgroundColor: token.colorBgContainer,
                                    color: token.colorText,
                                    cursor: 'pointer'
                                }} 
                            />
                        </Badge>
                    </Dropdown>

                    <Dropdown 
                        overlay={profileMenu} 
                        placement="bottomRight" 
                        arrow={{ pointAtCenter: true }}
                        trigger={['click']}
                    >
                        <div style={profileStyle}>
                            <Avatar 
                                icon={<UserOutlined />} 
                                style={{ 
                                    backgroundColor: token.colorPrimary,
                                    color: token.colorTextLightSolid
                                }} 
                            />
                            <span style={{ color: token.colorText }}>
                                {user.first_name}
                            </span>
                        </div>
                    </Dropdown>
                </div>
            </Header>

            <Content>
                <Outlet />
                <ChatUiButton />
                
            </Content>
        </Layout>
    );
};

export default AppLayout;
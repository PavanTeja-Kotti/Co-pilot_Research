import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd';
import { UserOutlined, HomeOutlined, AppstoreOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../utils/auth';

const { Header, Content } = Layout;
const { Title } = Typography;
const { useToken } = theme;

const AppLayout = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const { token } = useToken();

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
        <Layout 
            style={{ 
                minHeight: '100vh',
                background: token.colorBgContainer
            }}
        >
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
                        },
                        {
                            key: '/summarization',
                            icon: <AppstoreOutlined />,
                            label: <Link to="/summarization">summarization</Link>
                        }
                    ]}
                />

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
            </Header>

            {/* <Content 
                style={{ 
                    padding: token.paddingLG,
                    maxWidth: '1200px',
                    width: '100%',
                    margin: '0 auto'
                }}
            >
                <div style={{ 
                    background: token.colorBgElevated,
                    padding: token.padding,
                    borderRadius: token.borderRadiusLG,
                    minHeight: 280,
                    boxShadow: token.boxShadowTertiary
                }}>
                    <Outlet />
                </div>
            </Content> */}

<Content>
                <Outlet />
            </Content>
        </Layout>
    );
};

export default AppLayout;
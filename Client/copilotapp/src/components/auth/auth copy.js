// Auth.js
import React from 'react';
import { Form, Input, Button, Typography, Card, message, theme } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../utils/auth';

const { Title, Text } = Typography;
const { useToken } = theme;

const BackgroundSVG = () => {
  const svgStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1
  };

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1920 1080" 
      preserveAspectRatio="xMidYMid slice" 
      style={svgStyle}
    >
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      
      <pattern id="tech-research-icons" x="0" y="0" width="250" height="250" patternUnits="userSpaceOnUse">
        {/* AI & Machine Learning */}
        <path 
          d="M25 25 h20 v20 h-20 z m5 10 h10 m-12.5 -5 v10 m15 -10 v10" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Cloud Computing */}
        <path 
          d="M100 35 c-5 -5 5 -10 10 -5 c5 -10 20 -5 20 5 c10 -5 15 5 10 10 h-40 c-5 -5 0 -10 0 -10" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Database */}
        <path 
          d="M175 25 v20 h20 v-20 z m0 10 h20 m-20 -5 h20" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Scientific Flask */}
        <path 
          d="M25 100 l10 -20 v-10 h8 v10 l10 20 z" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Atom */}
        <circle cx="100" cy="100" r="1.5" fill="#404040"/>
        <ellipse 
          cx="100" 
          cy="100" 
          rx="12" 
          ry="4.8" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        <ellipse 
          cx="100" 
          cy="100" 
          rx="12" 
          ry="4.8" 
          transform="rotate(60 100 100)"
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        <ellipse 
          cx="100" 
          cy="100" 
          rx="12" 
          ry="4.8" 
          transform="rotate(120 100 100)"
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Graph */}
        <path 
          d="M175 100 l8 -8 l8 8 l8 -8 l8 8" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Laptop */}
        <path 
          d="M25 175 h30 l10 10 v20 h-40 z m5 15 h20 m-20 -7.5 h20" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Network */}
        <circle 
          cx="100" 
          cy="175" 
          r="8" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        <path 
          d="M92 175 h-10 m26 0 h10" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        
        {/* Chip */}
        <path 
          d="M175 175 l10 -10 h10 l10 10 l-10 10 h-10 z" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="2.5"
        />
        <path 
          d="M180 175 h20 m-10 -10 v20" 
          fill="none" 
          stroke="#404040" 
          strokeWidth="1.5"
        />
      </pattern>
      
      <rect width="100%" height="100%" fill="url(#tech-research-icons)"/>
      
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#1f1f1f" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.9"/>
        </radialGradient>
        
        <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.8"/>
          <stop offset="50%" stopColor="#0f0f0f" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.8"/>
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#centerGlow)" opacity="0.85"/>
      <rect width="100%" height="100%" fill="url(#techGradient)" opacity="0.75"/>
    </svg>
  );
};

const AuthCard = ({ children, title, subtitle }) => {
  const { token } = useToken();
  
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: token.padding,
    position: 'relative'
  };

  const cardStyle = {
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    width: '100%',
    maxWidth: 450,
    padding: token.paddingLG,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  };

  const titleStyle = {
    marginBottom: token.marginXS,
    color: token.colorTextHeading
  };

  return (
    <>
      <BackgroundSVG />
      <div style={containerStyle}>
        <Card bordered={false} style={cardStyle}>
          <Title level={2} style={titleStyle}>{title}</Title>
          <Text type="secondary">{subtitle}</Text>
          {children}
        </Card>
      </div>
    </>
  );
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = useToken();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Welcome back"
      subtitle={<>Don't have an account? <Link to="/register">Sign up</Link></>}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: token.marginLG }}
        onFinish={onFinish}
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' }
          ]}
        >
          <Input
            prefix={<MailOutlined className="site-form-item-icon" />}
            size="large"
            placeholder="Email address"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            size="large"
            placeholder="Password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Sign in
        </Button>
      </Form>
    </AuthCard>
  );
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = useToken();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await register(
        values.email,
        values.username,
        values.password,
        values.confirmPassword,
        values.firstName,
        values.lastName
      );
      message.success('Account created successfully!');
    //   navigate('/login');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create an account"
      subtitle={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: token.marginLG }}
        onFinish={onFinish}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginMD }}>
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: 'Please input your first name!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              size="large"
              placeholder="First name"
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            rules={[{ required: true, message: 'Please input your last name!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              size="large"
              placeholder="Last name"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' }
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            size="large"
            placeholder="Email address"
          />
        </Form.Item>

        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your username!' }]}
        >
          <Input
            prefix={<UserOutlined />}
            size="large"
            placeholder="Username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            size="large"
            placeholder="Password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject('Passwords do not match!');
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            size="large"
            placeholder="Confirm password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Create Account
        </Button>
      </Form>
    </AuthCard>
  );
};

export { Login, Register };
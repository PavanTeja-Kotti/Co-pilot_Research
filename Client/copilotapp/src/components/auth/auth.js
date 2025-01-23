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
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a">
            <animate 
              attributeName="stop-color" 
              values="#0f172a;#1e293b;#0f172a" 
              dur="8s" 
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#1e293b">
            <animate 
              attributeName="stop-color" 
              values="#1e293b;#0f172a;#1e293b" 
              dur="8s" 
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path 
            d="M 40 0 L 0 0 0 40" 
            fill="none" 
            stroke="#334155" 
            strokeWidth="0.5"
            opacity="0.2"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#bgGradient)"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>

      {/* Animated Lines */}
      {[...Array(5)].map((_, i) => (
        <path
          key={i}
          d={`M ${-200 + i * 500} 0 Q ${400 + i * 500} ${540 + Math.sin(i) * 200} ${2000 + i * 500} 1080`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1"
          opacity="0.15"
          filter="url(#glow)"
        >
          <animate
            attributeName="d"
            values={`
              M ${-200 + i * 500} 0 Q ${400 + i * 500} ${540 + Math.sin(i) * 200} ${2000 + i * 500} 1080;
              M ${-200 + i * 500} 0 Q ${400 + i * 500} ${540 - Math.sin(i) * 200} ${2000 + i * 500} 1080;
              M ${-200 + i * 500} 0 Q ${400 + i * 500} ${540 + Math.sin(i) * 200} ${2000 + i * 500} 1080
            `}
            dur="20s"
            repeatCount="indefinite"
          />
        </path>
      ))}

      {/* Floating dots */}
      {[...Array(30)].map((_, i) => (
        <g key={i} filter="url(#glow)">
          <circle
            r="1.5"
            fill="#60a5fa"
            opacity="0.4"
          >
            <animate
              attributeName="cx"
              values={`${Math.random() * 100}%;${Math.random() * 100}%`}
              dur={`${15 + Math.random() * 15}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${Math.random() * 100}%;${Math.random() * 100}%`}
              dur={`${15 + Math.random() * 15}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.8;0.4"
              dur={`${3 + Math.random() * 2}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
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
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: 450,
    padding: '40px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'relative',
    overflow: 'hidden'
  };

  const titleStyle = {
    marginBottom: token.marginXS,
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '32px',
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: '-0.5px'
  };

  const subtitleStyle = {
    textAlign: 'center',
    marginBottom: token.marginLG * 1.5,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '16px'
  };

  return (
    <>
      <BackgroundSVG />
      <div style={containerStyle}>
        <Card bordered={false} style={cardStyle}>
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
              opacity: 0.7
            }} 
          />
          <Title level={2} style={titleStyle}>{title}</Title>
          <Text style={subtitleStyle}>{subtitle}</Text>
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
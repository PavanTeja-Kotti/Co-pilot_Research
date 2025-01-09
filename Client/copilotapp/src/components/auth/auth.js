// Auth.js
import React from 'react';
import { Form, Input, Button, Typography, Card, message, theme } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../utils/auth';

const { Title, Text } = Typography;
const { useToken } = theme;

const AuthCard = ({ children, title, subtitle }) => {
  const { token } = useToken();
  
  const containerStyle = {
    minHeight: 'calc(100vh - 32px)',
    background: token.colorBgContainer,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: token.padding
  };

  const formStyle = {
    background: `linear-gradient(145deg, ${token.colorBgElevated}, ${token.colorBgContainer})`,
    borderRadius: token.borderRadiusLG,
    width: '100%',
    maxWidth: '450px',
    padding: token.paddingLG,
    boxShadow: `0 4px 30px ${token.colorTextSecondary}25`,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${token.colorBorder}`,
  };
  
  const inputStyle = {
    backgroundColor: `${token.colorBgContainer}80`,
    borderColor: token.colorBorder,
    '&:hover, &:focus': {
      backgroundColor: `${token.colorBgContainer}bf`,
      borderColor: token.colorPrimary,
    }
  };

  return (
    <div style={containerStyle}>
      <Card bordered={false} style={formStyle}>
        <Title level={2} style={{ marginBottom: token.marginXS }}>{title}</Title>
        <Text type="secondary">{subtitle}</Text>
        {children}
      </Card>
    </div>
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
      navigate('/');
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
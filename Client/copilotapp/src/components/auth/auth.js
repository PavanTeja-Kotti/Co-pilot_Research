import React from 'react';
import { Form, Input, Button, Typography, Card, message, theme,Layout } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeTwoTone, EyeInvisibleOutlined,DatabaseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../utils/auth';
import { pad } from 'lodash';
import Logo from '../../asset/HeaderLogo';
import './auth.css'

// Import background image
import backgroundImage from './test2.svg'; // Ensure this path matches your image location

const { Title, Text } = Typography;
const { useToken } = theme;



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

const AuthCard = ({ children,title,subtitle }) => {
  const { token } = useToken();

  return (
   
      <div className="auth-container" style={{ 
        display: 'flex', 
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        // backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#161617',

      }}>
        <div 
          className="brand-side"
          style={{
           
            flex: 1,
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: token.paddingLG,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            // backdropFilter: 'blur(8px)',
          }}
        >
          <div className="brand-content" style={{ textAlign: 'center' }}>
            <Title 
              className="brand-title"
              style={{ 
                color: token.colorPrimary, 
                marginBottom: token.marginMD,
              }}
            >
              {/* Tech Titans */}
            </Title>
            <Text 
              className="brand-description"
              style={{ 
                color: token.colorTextSecondary, 
                fontSize: token.fontSizeLG,
              }}
            >
              {/* Welcome to our platform. Manage your tasks efficiently with us. */}
            </Text>
          </div>
        </div>
        <div 
          className="form-side"
          style={{
            flex: 1,
            // display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: token.paddingLG,
            // backgroundColor: 'rgba(0, 21, 41, 0.5)',
            // backdropFilter: 'blur(8px)',
           
          }}
        >
          <div className='authcard' style={{ 
            
            paddingTop:title==='Welcome back'?"123px":token.paddingMD,
            maxWidth: 460, 
            width: '100%',
            borderRadius: token.borderRadius,
            // backgroundColor: '#161617',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            marginTop:"-23px"
}}>
          <Card  style={{
            paddingTop:"0px",
            backgroundColor: '#202021',
          }}>
          <Title level={2} >{title}</Title>
          <Text >{subtitle}</Text>
          
            {children}
          </Card>
          
          </div>
        </div>
      </div>
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
export  {Login,Register};
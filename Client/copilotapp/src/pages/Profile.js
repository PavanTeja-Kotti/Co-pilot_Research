import React, { useState } from 'react';
import { Card, Avatar, Typography, Tabs, Form, Input, Button, message, Row, Col, Upload, Divider, Space } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  CameraOutlined, 
  EditOutlined,
  GlobalOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../utils/auth';

const { Title, Text, Paragraph } = Typography;

const Profile = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const validateUsername = async (_, value) => {
    if (!value) {
      return Promise.reject('Username is required');
    }
    if (value === user.username) {
      return Promise.resolve();
    }
    try {
      // Assuming you have an API endpoint to check username availability
      const response = await fetch(`/api/check-username/${value}`);
      const data = await response.json();
      if (data.exists) {
        return Promise.reject('Username already taken');
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.resolve(); // Let backend handle the uniqueness check
    }
  };

  const validateEmail = async (_, value) => {
    if (!value) {
      return Promise.reject('Email is required');
    }
    if (value === user.email) {
      return Promise.resolve();
    }
    try {
      // Assuming you have an API endpoint to check email availability
      const response = await fetch(`/api/check-email/${value}`);
      const data = await response.json();
      if (data.exists) {
        return Promise.reject('Email already registered');
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.resolve(); // Let backend handle the uniqueness check
    }
  };

  const onUpdateProfile = async (values) => {
    setLoading(true);
    try {
    
      await updateProfile(values);
      message.success('Profile updated successfully!');
    } catch (error) {
      if (error.response?.data?.email) {
        message.error('Email already registered');
        profileForm.setFields([
          {
            name: 'email',
            errors: ['Email already registered'],
          },
        ]);
      } else if (error.response?.data?.username) {
        message.error('Username already taken');
        profileForm.setFields([
          {
            name: 'username',
            errors: ['Username already taken'],
          },
        ]);
      } else {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onUpdatePassword = async (values) => {
    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success('Password updated successfully!');
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <Row gutter={[24, 24]}>
        {/* Left Column - Profile Info */}
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={140}
                  icon={<UserOutlined />}
                  src={user.avatar}
                  style={{
                    backgroundColor: '#1890ff',
                    border: '4px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                />
                <Upload 
                  showUploadList={false}
                  beforeUpload={() => false}
                  
                >
                  <Button 
                    type="primary" 
                    shape="circle" 
                    icon={<CameraOutlined />}
                    size="middle"
                    style={{ 
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      border: '2px solid #fff'
                    }}
                  />
                </Upload>
              </div>
              <Title level={3} style={{ margin: '16px 0 4px' }}>
                {user.first_name} {user.last_name}
              </Title>
              <Text type="secondary">{user.email}</Text>

              <Divider style={{ margin: '20px 0' }} />

              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary"><GlobalOutlined /> Username</Text>
                  <Paragraph strong>{user.username}</Paragraph>
                </div>
                {user.bio && (
                  <div>
                    <Text type="secondary"><InfoCircleOutlined /> Bio</Text>
                    <Paragraph>{user.bio}</Paragraph>
                  </div>
                )}
              </Space>
            </div>
          </Card>
        </Col>

        {/* Right Column - Forms */}
        <Col xs={24} md={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <Tabs 
              defaultActiveKey="profile"
              style={{ marginTop: -8 }}
              items={[
                {
                  key: 'profile',
                  label: (
                    <span>
                      <UserOutlined />
                      Profile Information
                    </span>
                  ),
                  children: (
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={onUpdateProfile}
                      initialValues={{
                        email: user.email,
                        username: user.username,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        bio: user.bio || ''
                      }}
                      style={{ padding: '0px 0' }}
                    >
                         <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="first_name"
                            label="First Name"
                          >
                            <Input 
                              prefix={<UserOutlined className="text-gray-400" />}
                              size="large"
                              placeholder="Enter your first name"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="last_name"
                            label="Last Name"
                          >
                            <Input 
                              prefix={<UserOutlined className="text-gray-400" />}
                              size="large"
                              placeholder="Enter your last name"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        name="email"
                        label="Email"
                        
                        rules={[
                          { required: true, message: 'Email is required' },
                          { type: 'email', message: 'Please enter a valid email' },
                          // { validator: validateEmail }
                        ]}
                        validateTrigger="onBlur"
                      >
                        <Input 
                        disabled
                          prefix={<MailOutlined className="text-gray-400" />}
                          size="large"
                          placeholder="Enter your email"
                        />
                      </Form.Item>

                      <Form.Item
                        name="username"
                        label="Username"
                        rules={[
                          { required: true, message: 'Username is required' },
                          { min: 3, message: 'Username must be at least 3 characters' },
                          // { validator: validateUsername }
                        ]}
                        validateTrigger="onBlur"
                      >
                        <Input 
                          prefix={<GlobalOutlined className="text-gray-400" />}
                          size="large"
                          placeholder="Choose a username"
                        />
                      </Form.Item>

                     

                      <Form.Item 
                        name="bio" 
                        label="Bio"
                      >
                        <Input.TextArea 
                          rows={2}
                          size="large"
                          placeholder="Tell us about yourself..."
                          maxLength={500}
                          showCount
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          icon={<EditOutlined />}
                          size="large"
                          style={{ minWidth: 150 }}
                        >
                          Update Profile
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'security',
                  label: (
                    <span>
                      <LockOutlined />
                      Security Settings
                    </span>
                  ),
                  children: (
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      onFinish={onUpdatePassword}
                      style={{ maxWidth: 500, padding: '20px 0' }}
                    >
                      <Form.Item
                        name="currentPassword"
                        label="Current Password"
                        rules={[{ required: true, message: 'Current password is required' }]}
                      >
                        <Input.Password 
                          prefix={<LockOutlined className="text-gray-400" />}
                          size="large"
                          placeholder="Enter your current password"
                        />
                      </Form.Item>

                      <Form.Item
                        name="newPassword"
                        label="New Password"
                        rules={[
                          { required: true, message: 'New password is required' },
                          { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                        extra={
                          <Text type="secondary">
                            <InfoCircleOutlined /> Password must be at least 6 characters
                          </Text>
                        }
                      >
                        <Input.Password 
                          prefix={<LockOutlined className="text-gray-400" />}
                          size="large"
                          placeholder="Enter your new password"
                        />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: 'Please confirm your password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject('Passwords do not match');
                            },
                          }),
                        ]}
                      >
                        <Input.Password 
                          prefix={<LockOutlined className="text-gray-400" />}
                          size="large"
                          placeholder="Confirm your new password"
                        />
                      </Form.Item>

                      <Form.Item>
                        <Space size="middle" style={{ width: '100%' }}>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            size="large"
                            style={{ minWidth: 150 }}
                          >
                            Update Password
                          </Button>
                          <Button 
                            danger
                            size="large"
                            onClick={logout}
                          >
                            Logout
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  ),
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
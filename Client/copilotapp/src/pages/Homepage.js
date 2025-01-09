
import React from 'react';
import { useAuth } from '../utils/auth';
import { Typography } from 'antd';

const { Title } = Typography;
const HomePage = () => {
    const { user } = useAuth();
    
    return    <Title style={{color:"white"}} level={2}>Welcome {user.first_name} {user.last_name}</Title>
           
       
};

export default HomePage;
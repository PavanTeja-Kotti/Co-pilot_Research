import React from 'react';
import logo from './loggogog.jpeg';

const Logo = ({ className = '' }) => {
 const logoStyle = {
   width: '200px',
   height: '50px',
   objectFit: 'contain',
   display: 'flex',
   alignItems: 'left',
   backgroundColor: 'inherit', // Dark background
  //  marginLeft:'-10px',
   transform: 'scale(1.2)'

  //  padding: '0.5rem'
 };
 

 return (
   <img  
     src={logo} 
     alt="Research Assistant Logo" 
     style={logoStyle}
     className={className} 
   />
 );
};

export default Logo;
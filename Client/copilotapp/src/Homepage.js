
import React from 'react';
import { useAuth } from './utils/auth';

const HomePage = () => {
    const { logout ,user} = useAuth();
    
    console.log("nsb",user);
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome  {user.first_name}  {user.last_name} </h1>
            <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                Logout
            </button>
        </div>
    );
};


export default HomePage;
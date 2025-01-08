
import React from 'react';
import { useAuth } from './utils/auth';

const HomePage = () => {
    const { logout } = useAuth();
    
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome to Dashboard</h1>
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
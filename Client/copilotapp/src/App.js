import  SessionErrorBanner  from './components/common/SessionErrorBanner';
import { useAuth } from './utils/auth';
import { AuthProvider } from './utils/auth';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login  from './components/auth/Login';


function App() {
    const { sessionError } = useAuth();
    const [showError, setShowError] = useState(true);

    useEffect(() => {
        if (sessionError) {
            setShowError(true);
        }
    }, [sessionError]);

    return (
        <>
        
            {showError && sessionError && (
                <SessionErrorBanner 
                    error={sessionError}
                    onDismiss={() => setShowError(false)}
                />
            )}
           
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {/* <Route path="/register" element={<Register />} /> */}
                    {/* <Route path="/" element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    } /> */}
                    {/* Other routes */}
                </Routes>
            
        </>
        
    );
}


export default App;

import React, { useEffect, useState } from 'react';
import { useAuth } from './auth';
import  SessionErrorBanner  from '../components/common/SessionErrorBanner';


const AuthWrapper = ({ children }) => {
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
            {children}
        </>
    );
};


export default AuthWrapper;
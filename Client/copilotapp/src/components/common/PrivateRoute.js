const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading, sessionError } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated || sessionError) {
        return <Navigate 
            to="/login" 
            state={{ 
                from: location,
                error: sessionError 
            }} 
            replace 
        />;
    }

    return children;
};



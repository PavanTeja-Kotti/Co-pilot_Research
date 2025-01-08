const PublicRoute = ({ children }) => {
    const { user } = useAuth();
    
    // If user is authenticated, redirect to home
    if (user) {
        return <Navigate to="/" replace />;
    }
    
    return children;
};
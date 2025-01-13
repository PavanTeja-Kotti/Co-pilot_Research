// components/common/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../utils/auth';

const PrivateRoute = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {

        
        return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
    }
    return children;
};


export default PrivateRoute;
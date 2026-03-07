import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PostEditor from './pages/PostEditor';
import MediaPage from './pages/MediaPage';
import PublicBlog from './pages/PublicBlog';
import PostView from './pages/PostView';

function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
    const { user } = useAuth();
    return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public routes */}
                <Route path="/blog" element={<PublicBlog />} />
                <Route path="/blog/:id" element={<PostView />} />

                {/* Auth routes (redirect to dashboard if logged in) */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Protected author routes */}
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/editor/:id" element={<PrivateRoute><PostEditor /></PrivateRoute>} />
                <Route path="/media" element={<PrivateRoute><MediaPage /></PrivateRoute>} />

                {/* Redirects */}
                <Route path="/" element={<Navigate to="/blog" replace />} />
                <Route path="*" element={<Navigate to="/blog" replace />} />
            </Routes>
        </AuthProvider>
    );
}

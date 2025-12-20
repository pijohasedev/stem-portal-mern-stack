// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    // 1. Ambil data dari LocalStorage
    const token = localStorage.getItem('authToken');
    const mustChangePassword = localStorage.getItem('mustChangePassword') === 'true'; // Tukar string jadi boolean

    // 2. SEMAKAN 1: Adakah pengguna sudah Login? (Ada token tak?)
    if (!token) {
        // Jika tiada token, tendang balik ke Login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. SEMAKAN 2: Adakah pengguna WAJIB tukar password?
    // Jika ya, dan dia bukan berada di page tukar password sekarang...
    if (mustChangePassword && location.pathname !== '/change-password') {
        // ...Tendang dia ke page Tukar Password
        return <Navigate to="/change-password" replace />;
    }

    // 4. Jika semua OK, benarkan masuk (Paparkan halaman yang diminta)
    return children;
};

export default ProtectedRoute;
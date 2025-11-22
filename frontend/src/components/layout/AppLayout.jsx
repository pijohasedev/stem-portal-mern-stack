import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

// 1. Perhatikan bahagian dalam kurungan ini ({ ... })
// Pastikan perkataan 'user' ada disenaraikan di sini!
const AppLayout = ({ children, onLogout, userRole, user }) => {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Debugging: Mari lihat adakah AppLayout menerima data
    useEffect(() => {
        console.log("AppLayout menerima user:", user);
    }, [user]);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">

            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onLogout={onLogout}
                userRole={userRole}
                user={user} // Hantar ke Sidebar (untuk footer)
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">

                {/* ✅ 2. HANTAR KE NAVBAR DISINI */}
                <Navbar
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                    user={user} // <--- INI YANG PENTING
                />

                {/* Content Page */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
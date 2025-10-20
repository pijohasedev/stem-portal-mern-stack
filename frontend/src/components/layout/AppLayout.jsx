import Sidebar from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from "@/components/ui/button";
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useState } from 'react';

function AppLayout({ children, onLogout, userRole }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen w-full bg-background">
            <Sidebar isOpen={isSidebarOpen} onLogout={onLogout} userRole={userRole} />

            <div className="flex flex-col flex-1">
                <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
                    <Button variant="ghost" className="text-muted-foreground" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Bars3Icon className="h-6 w-6" />
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                    <div className="flex-1"></div>
                    <ThemeToggle />
                </header>
                <main className="flex-1 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
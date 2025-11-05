import { cn } from '@/lib/utils';
import {
    ArchiveBoxIcon,
    ChartBarIcon,
    DocumentDuplicateIcon, MapIcon,
    PlusIcon,
    PowerIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';

function SidebarLink({ to, icon: Icon, children, isCollapsed }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            title={isCollapsed ? children : ''}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                isActive ? 'bg-muted text-primary font-semibold' : 'text-muted-foreground hover:text-primary',
                isCollapsed && "justify-center"
            )}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className={cn("truncate", isCollapsed && "hidden")}>{children}</span>
        </Link>
    );
}

function Sidebar({ isOpen, onLogout, userRole }) {
    const isCollapsed = !isOpen;

    return (
        <aside className={cn("bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col", isOpen ? "w-64" : "w-20")}>
            <div className="p-4 border-b border-border h-14 flex items-center justify-center">
                <h1 className={cn("text-xl font-bold text-primary truncate", isCollapsed && "hidden")}>STEM Portal</h1>
                {!isOpen && <h1 className="text-xl font-bold text-primary">SP</h1>}
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {userRole === 'admin' ? (
                    <>
                        <SidebarLink to="/" icon={ChartBarIcon} isCollapsed={isCollapsed}>Overview</SidebarLink>
                        <SidebarLink to="/initiatives" icon={ArchiveBoxIcon} isCollapsed={isCollapsed}>Senarai Inisiatif</SidebarLink>
                        <SidebarLink to="/reports" icon={DocumentDuplicateIcon} isCollapsed={isCollapsed}>Pelaporan</SidebarLink>
                        <SidebarLink to="/planning" icon={MapIcon} isCollapsed={isCollapsed}>Dasar STEM</SidebarLink>
                        <SidebarLink to="/users" icon={UserGroupIcon} isCollapsed={isCollapsed}>Pengguna</SidebarLink>
                    </>
                ) : (
                    <>
                        <SidebarLink to="/" icon={ArchiveBoxIcon} isCollapsed={isCollapsed}>Inisiatif</SidebarLink>
                        <SidebarLink to="/submit-report" icon={PlusIcon} isCollapsed={isCollapsed}>Hantar Laporan</SidebarLink>
                        <SidebarLink to="/report-history" icon={DocumentDuplicateIcon} isCollapsed={isCollapsed}>Sejarah Laporan</SidebarLink>
                    </>
                )}
            </nav>

            <div className="mt-auto p-4">
                <button onClick={onLogout} title={isCollapsed ? 'Log Out' : ''} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary w-full", isCollapsed && "justify-center")}>
                    <PowerIcon className="h-5 w-5 flex-shrink-0" />
                    <span className={cn("truncate", isCollapsed && "hidden")}>Keluar</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
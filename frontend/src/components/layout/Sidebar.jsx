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
                "relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 group",
                isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 translate-x-1"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                isCollapsed && "justify-center px-0"
            )}
        >
            <Icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-transform duration-300",
                isActive ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className={cn(
                "truncate font-medium text-sm transition-opacity duration-300",
                isCollapsed ? "hidden opacity-0" : "block opacity-100"
            )}>
                {children}
            </span>
        </Link>
    );
}

function SectionLabel({ children, isCollapsed }) {
    if (isCollapsed) return <div className="my-4 border-t border-slate-200 dark:border-slate-700 mx-2" />;
    return (
        <div className="mt-6 mb-2 px-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {children}
            </h3>
        </div>
    );
}

function Sidebar({ isOpen, onLogout, userRole, user }) {
    const isCollapsed = !isOpen;

    const isMonitorRole = userRole === 'Admin' || userRole === 'Bahagian' || userRole === 'Negeri';
    const isReporterRole = userRole === 'PPD' || userRole === 'User'; // Pelapor Tulen
    const isHybridRole = userRole === 'Bahagian' || userRole === 'Negeri'; // Pemantau + Pelapor

    return (
        <aside
            className={cn(
                "relative bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isOpen ? "w-72" : "w-20"
            )}
        >
            {/* HEADER */}
            <div className="h-20 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-blue-600">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <div className={cn("flex flex-col overflow-hidden transition-all duration-300", isCollapsed && "w-0 opacity-0")}>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white whitespace-nowrap leading-tight">STEM Portal</h1>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">KPM MALAYSIA</span>
                    </div>
                </div>
            </div>

            {/* MENU */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">

                {/* 1. Pautan untuk Pelapor Tulen (PPD/User) */}
                {isReporterRole && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Inisiatif Saya</SectionLabel>
                        <SidebarLink to="/" icon={ArchiveBoxIcon} isCollapsed={isCollapsed}>Tugasan Inisiatif</SidebarLink>
                        <SidebarLink to="/submit-report" icon={PlusIcon} isCollapsed={isCollapsed}>Hantar Laporan</SidebarLink>
                        <SidebarLink to="/report-history" icon={DocumentDuplicateIcon} isCollapsed={isCollapsed}>Sejarah Laporan</SidebarLink>
                    </>
                )}

                {/* 2. Pautan untuk Pemantau (Admin/Bahagian/Negeri) */}
                {/* ------------------------------------------------------- */}
                {/* 2. Menu PEMANTAU (Admin/Bahagian/Negeri) */}
                {/* ------------------------------------------------------- */}
                {(userRole === 'Admin' || userRole === 'Bahagian' || userRole === 'Negeri') && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Pemantauan Utama</SectionLabel>

                        {/* Dashboard → Admin SAHAJA */}
                        {userRole === 'Admin' && (
                            <SidebarLink to="/" icon={ChartBarIcon} isCollapsed={isCollapsed}>
                                Dashboard
                            </SidebarLink>
                        )}

                        {/* Senarai Inisiatif → Admin SAHAJA */}
                        {userRole === 'Admin' && (
                            <SidebarLink to="/initiatives" icon={ArchiveBoxIcon} isCollapsed={isCollapsed}>
                                Senarai Inisiatif
                            </SidebarLink>
                        )}

                        {/* Pantau Laporan → Semua pemantau (Admin/Bahagian/Negeri) */}
                        <SidebarLink to="/reports" icon={DocumentDuplicateIcon} isCollapsed={isCollapsed}>
                            Pantau Laporan
                        </SidebarLink>
                    </>
                )}


                {/* 3. Pautan untuk Hybrid (Bahagian/Negeri yang juga kena lapor.) */}
                {isHybridRole && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Pelaporan Kendiri</SectionLabel>

                        <SidebarLink to="/" icon={ArchiveBoxIcon} isCollapsed={isCollapsed}>Tugasan Inisiatif</SidebarLink>

                        <SidebarLink to="/submit-report" icon={PlusIcon} isCollapsed={isCollapsed}>Hantar Laporan</SidebarLink>
                        <SidebarLink to="/report-history" icon={DocumentDuplicateIcon} isCollapsed={isCollapsed}>Sejarah Laporan</SidebarLink>
                    </>
                )}

                {/* 4. Pautan Admin Sahaja */}
                {userRole === 'Admin' && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Pentadbiran</SectionLabel>
                        <SidebarLink to="/planning" icon={MapIcon} isCollapsed={isCollapsed}>Perancangan Dasar</SidebarLink>
                        <SidebarLink to="/users" icon={UserGroupIcon} isCollapsed={isCollapsed}>Pengguna Sistem</SidebarLink>
                    </>
                )}
            </nav>

            {/* FOOTER */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <div className={cn("flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
                                {user?.firstName || 'Akaun Anda'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase truncate max-w-[100px]">
                                {userRole}
                            </span>
                        </div>
                    )}
                    <button onClick={onLogout} title="Log Keluar" className="group flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
                        <PowerIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
import { cn } from '@/lib/utils';
import {
    // Ikon
    Archive,
    BarChart3,
    BookOpen,
    Building2,
    CalendarClock,
    ClipboardCheck,
    Download,
    Files,
    FileSpreadsheet,
    LayoutDashboard,
    LogOut,
    Map,
    Megaphone,
    Plus,
    ShieldCheck,
    UploadCloud,
    Users
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// --- 🔥 KOMPONEN LINK YANG DI-UPGRADE (WOW FACTOR) ---
function SidebarLink({ to, icon: Icon, children, isCollapsed }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            title={isCollapsed ? children : ''}
            className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ease-out overflow-hidden border border-transparent",
                isActive
                    // ACTIVE STATE: Neon Blue Glow + Solid Color
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-500"
                    // HOVER STATE: Glassy Effect + Slide
                    : "text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10"
            )}
        >
            {/* ✨ Efek Gradient Halus bila Hover (Hanya muncul bila hover) */}
            {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}

            {/* Ikon dengan animasi 'Pop' */}
            <Icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-all duration-300 relative z-10",
                isActive
                    ? "text-white scale-100"
                    : "text-slate-500 group-hover:text-blue-400 group-hover:scale-110" // Ikon jadi biru & besar sikit bila hover
            )} />

            <span className={cn(
                "truncate font-medium text-sm transition-all duration-300 origin-left relative z-10",
                // Teks bergerak ke kanan sikit (translate-x-1) bila hover
                !isActive && "group-hover:translate-x-1",
                isCollapsed ? "hidden w-0 opacity-0" : "block w-full opacity-100"
            )}>
                {children}
            </span>

            {/* Indicator Dot Moden (Bila Collapsed) */}
            {isActive && isCollapsed && (
                <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
        </Link>
    );
}

// --- KOMPONEN LABEL ---
function SectionLabel({ children, isCollapsed }) {
    if (isCollapsed) return <div className="my-2 border-t border-slate-700 mx-4" />;

    return (
        <div className="mt-6 mb-2 px-3 flex items-center gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-300 transition-colors">
                {children}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
        </div>
    );
}

function Sidebar({ isOpen, onLogout, userRole, user }) {
    const isCollapsed = !isOpen;

    // NORMALIZE ROLE
    const role = (userRole || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPPD = role === 'ppd';
    const isJPN = role === 'negeri' || role === 'bahagian';
    const isUser = role === 'user';
    const isReporter = isPPD || isUser || isJPN;
    const isMonitor = isAdmin || isJPN;

    // Logic Enrolmen
    const showEnrollmentVerify = isPPD || isAdmin;
    const showEnrollmentDashboard = (role === 'negeri') || isAdmin;
    const showEnrollmentImport = isAdmin;
    const showEnrollmentExport = isAdmin;
    const showSessionSettings = isAdmin;
    const showKPMDashboard = isAdmin;

    return (
        <aside
            className={cn(
                // Background Gelap Premium
                "relative z-20 h-screen flex flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-2xl",
                isOpen ? "w-64" : "w-[70px]"
            )}
        >
            {/* HEADER (Glassmorphism Dark) */}
            <div className="h-16 flex items-center justify-center border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "px-0" : "px-4 w-full")}>
                    {/* Logo Box dengan Glow */}
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 border border-blue-500/20">
                        <LayoutDashboard className="h-5 w-5 text-white" />
                    </div>

                    <div className={cn("flex flex-col overflow-hidden transition-all duration-300", isCollapsed && "w-0 opacity-0 hidden")}>
                        <h1 className="text-base font-bold text-white leading-none tracking-tight">
                            Portal STEM
                        </h1>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                            BPPDP, KPM
                        </span>
                    </div>
                </div>
            </div>

            {/* SCROLLABLE MENU */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar-dark">

                {/* A. INISIATIF SAYA */}
                {isReporter && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Inisiatif Saya</SectionLabel>
                        <SidebarLink to="/" icon={Archive} isCollapsed={isCollapsed}>Tugasan Inisiatif</SidebarLink>
                        <SidebarLink to="/submit-report" icon={Plus} isCollapsed={isCollapsed}>Hantar Laporan</SidebarLink>
                        <SidebarLink to="/report-history" icon={Files} isCollapsed={isCollapsed}>Sejarah Laporan</SidebarLink>
                    </>
                )}

                {/* B. PEMANTAUAN UTAMA */}
                {isMonitor && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Pemantauan</SectionLabel>

                        {isAdmin && (
                            <>
                                <SidebarLink to="/dashboard" icon={BarChart3} isCollapsed={isCollapsed}>Dashboard</SidebarLink>
                                <SidebarLink to="/initiatives" icon={Archive} isCollapsed={isCollapsed}>Senarai Inisiatif</SidebarLink>
                            </>
                        )}

                        <SidebarLink to="/reports" icon={Files} isCollapsed={isCollapsed}>Pantau Laporan</SidebarLink>
                    </>
                )}

                <SectionLabel isCollapsed={isCollapsed}>Program</SectionLabel>
                <SidebarLink to="/programs" icon={BookOpen} isCollapsed={isCollapsed}>Inisiatif STEM</SidebarLink>

                {/* C. PENGURUSAN ENROLMEN */}
                {(showEnrollmentVerify || showEnrollmentDashboard || showEnrollmentImport) && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Enrolmen</SectionLabel>

                        {showEnrollmentVerify && (
                            <SidebarLink to="/enrollment/verify" icon={ClipboardCheck} isCollapsed={isCollapsed}>Semakan PPD</SidebarLink>
                        )}

                        {showEnrollmentDashboard && (
                            <SidebarLink to="/enrollment/jpn-dashboard" icon={FileSpreadsheet} isCollapsed={isCollapsed}>Dashboard Enrolmen</SidebarLink>
                        )}

                        {showKPMDashboard && (
                            <SidebarLink to="/enrollment/kpm-dashboard" icon={Building2} isCollapsed={isCollapsed}>Dashboard KPM</SidebarLink>
                        )}

                        {showEnrollmentImport && (
                            <SidebarLink to="/enrollment/import" icon={UploadCloud} isCollapsed={isCollapsed}>Import Data</SidebarLink>
                        )}

                        {showEnrollmentExport && (
                            <SidebarLink to="/enrollment/export" icon={Download} isCollapsed={isCollapsed}>Eksport Laporan</SidebarLink>
                        )}

                        {showSessionSettings && (
                            <SidebarLink to="/enrollment/settings" icon={CalendarClock} isCollapsed={isCollapsed}>Tetapan Sesi</SidebarLink>
                        )}
                    </>
                )}

                {/* D. KOMUNIKASI & ADMIN */}
                {isAdmin && (
                    <>
                        <SectionLabel isCollapsed={isCollapsed}>Pentadbir</SectionLabel>
                        <SidebarLink to="/admin/announcements" icon={Megaphone} isCollapsed={isCollapsed}>Pengumuman</SidebarLink>
                        <SidebarLink to="/planning" icon={Map} isCollapsed={isCollapsed}>Perancangan Dasar</SidebarLink>
                        <SidebarLink to="/users" icon={Users} isCollapsed={isCollapsed}>Pengguna Sistem</SidebarLink>
                    </>
                )}

            </nav>

            {/* USER PROFILE FOOTER */}
            <div className="p-3 border-t border-slate-800 bg-slate-950">
                <div className={cn(
                    "flex items-center gap-3 rounded-xl p-2 transition-all duration-300",
                    isCollapsed ? "justify-center" : "bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                )}>
                    {/* Avatar */}
                    <div className="relative h-9 w-9 rounded-full bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-600 shadow-sm">
                        {isAdmin ?
                            <ShieldCheck className="h-5 w-5 text-blue-400" /> :
                            <Users className="h-5 w-5 text-slate-400" />
                        }
                    </div>

                    {!isCollapsed && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="text-sm font-semibold text-slate-200 truncate">
                                {user?.firstName || 'Pengguna'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider truncate">
                                {userRole}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={onLogout}
                        title="Log Keluar"
                        className={cn(
                            "flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300",
                            isCollapsed ? "absolute -right-1 -top-1 h-4 w-4 bg-slate-800 border border-slate-700 rounded-full p-0.5" : "h-8 w-8"
                        )}
                    >
                        <LogOut className={isCollapsed ? "h-2 w-2" : "h-4 w-4"} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
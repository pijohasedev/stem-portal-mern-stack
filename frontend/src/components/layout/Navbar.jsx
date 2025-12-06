import api from "@/api";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bars3Icon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // Ikon Asal
import { CheckCheck, Megaphone } from "lucide-react"; // Ikon untuk isi Notifikasi
import { useEffect, useState } from "react";

// Nota: Pastikan prop ini sepadan dengan apa yang dihantar dari AppLayout (biasanya onMenuClick)
function Navbar({ onMenuClick, user }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // --- 1. LOGIK PROFIL (DARI KOD ASAL ANDA) ---
    // Dapatkan parap (initial) nama untuk avatar (cth: Ali -> A)
    const userInitial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';

    // --- 2. LOGIK NOTIFIKASI (BARU) ---
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get('/announcements/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (error) {
            console.error("Error fetching notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.put(`/announcements/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, readBy: [...n.readBy, user.id] } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const token = localStorage.getItem('authToken');
            await api.put(`/announcements/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, readBy: [...n.readBy, user.id] })));
        } catch (err) { console.error(err) }
    }

    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-4 shadow-sm backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">

            {/* Butang Menu (Hamburger) */}
            <button
                type="button"
                className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
                onClick={onMenuClick}
            >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Pemisah */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                {/* Ruang Tengah (Tajuk) */}
                <div className="relative flex flex-1 items-center">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white hidden sm:block">
                        Portal Pengurusan STEM
                    </h2>
                </div>

                {/* --- BAHAGIAN KANAN --- */}
                <div className="flex items-center gap-x-4 lg:gap-x-6">

                    {/* A. BUTANG NOTIFIKASI (LOCENG DENGAN POPOVER) */}
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <div className="relative cursor-pointer">
                                <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
                                    <span className="sr-only">View notifications</span>
                                    <BellIcon className="h-6 w-6" aria-hidden="true" />
                                </button>
                                {/* Badge Merah */}
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white transform translate-x-1/3 -translate-y-1/3 animate-pulse"></span>
                                )}
                            </div>
                        </PopoverTrigger>

                        <PopoverContent className="w-80 p-0 mr-4" align="end">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                                <h4 className="font-semibold text-sm">Notifikasi</h4>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                        <CheckCheck className="h-3 w-3" /> Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Senarai Notifikasi */}
                            <div className="h-[300px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        Tiada pengumuman baharu.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((item) => {
                                            const isRead = item.readBy.includes(user?.id);
                                            return (
                                                <div
                                                    key={item._id}
                                                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!isRead ? 'bg-blue-50/40 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                                    onClick={() => !isRead && handleMarkRead(item._id)}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <Megaphone className={`h-3 w-3 ${item.priority === 'High' ? 'text-red-500' : 'text-blue-500'}`} />
                                                            <span className={`text-sm font-medium ${!isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                                {item.title}
                                                            </span>
                                                        </div>
                                                        {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500"></span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-3 mb-2">
                                                        {item.message}
                                                    </p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(item.createdAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        {item.priority === 'High' && <Badge variant="destructive" className="text-[10px] px-1 h-4">Penting</Badge>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Pemisah Kecil */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 dark:lg:bg-slate-700" aria-hidden="true" />

                    {/* B. PROFAIL PENGGUNA (REKA BENTUK ASAL) */}
                    <div className="flex items-center gap-3 pl-2">
                        {/* Teks Nama & Role */}
                        <div className="hidden lg:flex lg:flex-col lg:items-end">
                            <span className="text-sm font-bold leading-none text-slate-900 dark:text-white">
                                {user?.firstName || 'Pengguna'} {user?.lastName || ''}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">
                                {user?.role || 'Guest'}
                            </span>
                        </div>

                        {/* Avatar Bulat */}
                        <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                            {user?.firstName ? (
                                <span className="font-bold text-sm">{userInitial}</span>
                            ) : (
                                <UserCircleIcon className="h-6 w-6 text-white/80" />
                            )}
                            {/* Status Indicator (Dot Hijau) - Optional, uncomment jika mahu */}
                            {/* <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-900" /> */}
                        </div>
                    </div>

                </div>
            </div>
        </header>
    );
}

export default Navbar;
import { Bars3Icon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

function Navbar({ onMenuClick, user }) {

    console.log("Data User dalam Navbar:", user);
    // Dapatkan parap (initial) nama untuk avatar (cth: Ali -> A)
    const userInitial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';

    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-4 shadow-sm backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">

            {/* Butang Menu (Hamburger) - Untuk Mobile/Collapse */}
            <button
                type="button"
                className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
                onClick={onMenuClick}
            >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Pemisah (Separator) */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                {/* Ruang Tengah (Tajuk / Breadcrumb) */}
                <div className="relative flex flex-1 items-center">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white hidden sm:block">
                        Portal Pengurusan STEM
                    </h2>
                </div>

                {/* --- BAHAGIAN KANAN (Profil Pengguna) --- */}
                <div className="flex items-center gap-x-4 lg:gap-x-6">

                    {/* Butang Notifikasi (Placeholder) */}
                    <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Pemisah Kecil */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 dark:lg:bg-slate-700" aria-hidden="true" />

                    {/* Profail Pengguna */}
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
                            {/* Status Indicator (Dot Hijau) */}
                            <span /*className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-900"*/ />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Navbar;
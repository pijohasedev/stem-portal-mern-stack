import api from '@/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Import Icon
import { ArrowRight, Eye, EyeOff, LayoutDashboard, Loader2, Lock, Mail } from "lucide-react";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// ✅ PENTING: Terima prop 'onLoginSuccess' macam kod lama
function LoginPage({ onLoginSuccess }) {

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // State form
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            Swal.fire("Ralat", "Sila masukkan emel dan kata laluan.", "warning");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/users/login', formData);
            const { token, user } = response.data;

            // Simpan Data
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            // ✅ 1. Check 'Must Change Password' DULU (Logik asal)
            if (user.mustChangePassword === true) {
                // Simpan flag untuk protection
                localStorage.setItem('mustChangePassword', 'true');

                await Swal.fire({
                    title: 'Tukar Kata Laluan Diperlukan',
                    text: 'Demi keselamatan, sila tukar kata laluan sementara anda.',
                    icon: 'warning',
                    confirmButtonText: 'OK, Tukar Sekarang',
                    confirmButtonColor: '#2563eb'
                });

                setLoading(false); // Stop loading
                navigate('/change-password'); // Pergi page tukar password
                return; // STOP di sini. Jangan panggil onLoginSuccess lagi.
            }

            // --- JIKA PASSWORD OK ---

            // Notifikasi Berjaya
            const Toast = Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            Toast.fire({
                icon: "success",
                title: `Selamat Kembali, ${user.firstName}!`
            });

            // ✅ 2. PANGGIL PARENT COMPONENT (Ini yang kod lama buat)
            // Ini akan update state di App.jsx supaya dia render Dashboard
            if (onLoginSuccess) {
                onLoginSuccess(user);
            } else {
                // Fallback kalau onLoginSuccess tak dipasang
                navigate('/dashboard');
            }

        } catch (error) {
            console.error("Login Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Akses Ditolak',
                text: error.response?.data?.message || 'Emel atau kata laluan tidak sah.',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">

            {/* KIRI: BRANDING & KORPORAT */}
            <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <LayoutDashboard className="h-5 w-5 text-white" />
                        </div>
                        <span>Portal STEM</span>
                    </div>
                    <div className="mt-24">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 leading-tight">
                            Perkasa Pendidikan STEM<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                Masa Depan.
                            </span>

                        </h1>
                        <p className="text-lg text-gray-200 max-w-md">
                            #STEMuntukSEMUA
                        </p>
                        <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                            Sistem pengurusan data bersepadu dan pemantauan inisiatif STEM untuk BPPDP, KPM.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500 font-medium tracking-wide">
                    Hakcipta Terpelihara &copy; 2026 BPPDP, KPM
                </div>
            </div>

            {/* KANAN: BORANG LOGIN */}
            <div className="flex items-center justify-center p-6 bg-slate-50">
                <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">

                    {/* Header Mobile */}
                    <div className="flex flex-col space-y-2 text-center lg:hidden">
                        <div className="bg-slate-900 p-3 rounded-xl shadow-sm border w-fit mx-auto">
                            <LayoutDashboard className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Portal STEM
                        </h1>
                    </div>

                    <div className="grid gap-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="space-y-2 text-center mb-2">
                            <h2 className="text-xl font-semibold tracking-tight">Log Masuk Akaun</h2>
                            <p className="text-sm text-slate-500">Masukkan e-mel anda untuk log masuk ke<br />STEM Portal</p>

                        </div>

                        <form onSubmit={handleLogin}>
                            <div className="grid gap-5">

                                {/* Input Email */}
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-slate-600">Emel Pengguna</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="email"
                                            name="email"
                                            placeholder="nama@moe.gov.my"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Input Password */}
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" classname="text-slate-600">Kata Laluan</Label>
                                        {/*<a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                                            Lupa kata laluan?
                                        </a>*/}
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="password"
                                            name="password"
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Butang Login */}
                                <Button type="submit" disabled={loading} className="h-11 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sedang Memproses...
                                        </>
                                    ) : (
                                        <>
                                            Log Masuk <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <p className="text-center text-xs text-slate-400">
                        Sebarang masalah teknikal sila hubungi <br />
                        <span className="text-slate-600 font-medium">UPPS, BPPDP</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
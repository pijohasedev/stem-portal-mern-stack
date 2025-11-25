import api from '@/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Atom, Eye, EyeOff, Lock, Mail } from 'lucide-react'; // Pastikan lucide-react diinstall
import { useState } from 'react';
import Swal from 'sweetalert2';

function LoginPage({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.post('/users/login', { email, password });

            // On success, save the data and call the function from the parent
            const { token, user } = response.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            onLoginSuccess(user);

            const Toast = Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            Toast.fire({
                icon: "success",
                title: "Berjaya log masuk"
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Log Masuk Gagal',
                text: error.response?.data?.message || 'Sila periksa e-mel dan kata laluan anda.',
                confirmButtonColor: '#0F172A'
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            {/* KIRI: Borang Login */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
                <div className="mx-auto grid w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Atom className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Selamat Kembali</h1>
                        <p className="text-balance text-muted-foreground">
                            Masukkan e-mel anda untuk log masuk ke STEM Portal
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mel</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nama@moe.gov.my"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Kata Laluan</Label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="pl-9 pr-9"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-2 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300" disabled={isLoading}>
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                                    Sedang Memproses...
                                </div>
                            ) : 'Log Masuk'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-xs text-muted-foreground">
                        <p>&copy; 2025 Unit Perancangan Pendidikan STEM, BPPDP, KPM</p>
                    </div>
                </div>
            </div>

            {/* KANAN: Gambar Hiasan / Visual */}
            <div className="hidden bg-muted lg:block relative overflow-hidden">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold mb-4">Memperkasakan Masa Depan STEM </h2>
                    <p className="text-lg text-gray-200 max-w-md">
                        Sistem pengurusan berpusat untuk pemantauan inisiatif dan pelaporan aktiviti STEM.
                    </p>
                    <p className="text-lg text-gray-200 max-w-md">
                        #STEMuntukSEMUA
                    </p>
                </div>

                {/* Gambar Latar Belakang - Menggunakan placeholder sains/teknologi */}
                <img
                    src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop"
                    alt="STEM Education"
                    className="h-full w-full object-cover dark:brightness-[0.7] transition-transform duration-[20s] hover:scale-105"
                />
            </div>
        </div>
    );
}

export default LoginPage;
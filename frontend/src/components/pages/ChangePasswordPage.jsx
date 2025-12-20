import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, XCircle } from "lucide-react"; // Tambah Icon Lock & Shield
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ChangePassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // State input
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);

    // --- LOGIK VALIDASI ---
    const validations = [
        { id: 1, label: "Min. 8 aksara", valid: passwords.newPassword.length >= 8 },
        { id: 2, label: "Huruf Besar", valid: /[A-Z]/.test(passwords.newPassword) },
        { id: 3, label: "Huruf Kecil", valid: /[a-z]/.test(passwords.newPassword) },
        { id: 4, label: "Nombor", valid: /[0-9]/.test(passwords.newPassword) },
        { id: 5, label: "Simbol (!@#$)", valid: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.newPassword) },
    ];

    // Kira skor kekuatan (0 - 5)
    const validCount = validations.filter(v => v.valid).length;
    const strengthPercentage = (validCount / 5) * 100;

    // Tentukan warna bar kekuatan
    const getStrengthColor = () => {
        if (validCount <= 2) return "bg-red-500";
        if (validCount <= 4) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getStrengthLabel = () => {
        if (!passwords.newPassword) return "";
        if (validCount <= 2) return "Lemah";
        if (validCount <= 4) return "Sederhana";
        return "Kuat";
    };

    const isAllValid = validCount === 5;
    const isMatch = passwords.newPassword && passwords.newPassword === passwords.confirmPassword;

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAllValid || !isMatch) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/users/change-password',
                { newPassword: passwords.newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Swal.fire({
                title: "Berjaya!",
                text: "Kata laluan telah dikemaskini. Sila log masuk semula.",
                icon: "success",
                confirmButtonColor: "#2563eb"
            }).then(() => {
                localStorage.clear();
                navigate('/login');
            });

        } catch (error) {
            Swal.fire("Ralat", error.response?.data?.message || "Gagal menukar kata laluan.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[85vh] p-4 bg-slate-50">
            <Card className="w-full max-w-lg shadow-xl border border-slate-200 bg-white rounded-xl overflow-hidden">

                {/* HEADER BERGAYA */}
                <div className="bg-slate-900 p-6 text-center">
                    <div className="mx-auto bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg border border-slate-700">
                        <ShieldCheck className="h-6 w-6 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Keselamatan Akaun</h2>
                    <p className="text-slate-400 text-sm mt-1">Kemaskini kata laluan anda secara berkala.</p>
                </div>

                <CardContent className="p-6 pt-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* INPUT 1: Password Baru */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-medium">Kata Laluan Baru</Label>
                            <div className="relative">
                                {/* Ikon Kunci di Kiri */}
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                                <Input
                                    type={showPassword ? "text" : "password"}
                                    name="newPassword"
                                    value={passwords.newPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-10 transition-all focus:ring-2 focus:ring-blue-500/20"
                                />

                                {/* Butang Mata di Kanan */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* BAR KEKUATAN PASSWORD (STRENGTH METER) */}
                            {passwords.newPassword && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Kekuatan:</span>
                                        <span className={`font-bold transition-colors duration-300 ${validCount <= 2 ? "text-red-500" : validCount <= 4 ? "text-yellow-600" : "text-green-600"
                                            }`}>
                                            {getStrengthLabel()}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ease-out ${getStrengthColor()}`}
                                            style={{ width: `${strengthPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* GRID CHECKLIST (Design Compact) */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                            {validations.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    {item.valid ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                                    )}
                                    <span className={`text-xs transition-colors duration-200 ${item.valid ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* INPUT 2: Confirm Password */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-medium">Sahkan Kata Laluan</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={passwords.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`pl-10 h-10 transition-all ${isMatch && passwords.confirmPassword ? "border-green-500 ring-1 ring-green-100" : ""}`}
                                />
                                {passwords.confirmPassword && (
                                    <div className="absolute right-3 top-2.5">
                                        {isMatch ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 animate-in zoom-in" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500 animate-in zoom-in" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-semibold shadow-md transition-all active:scale-[0.98]"
                            disabled={loading || !isAllValid || !isMatch}
                        >
                            {loading ? "Sedang Proses..." : "Simpan Kata Laluan Baru"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default ChangePassword;
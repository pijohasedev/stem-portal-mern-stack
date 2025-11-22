import api from "@/api"; // ✅ 1. Import 'api'
import AppLayout from "@/components/layout/AppLayout";
import AllInitiatives from "@/components/pages/AllInitiatives";
import DashboardOverview from "@/components/pages/DashboardOverview";
import EditReport from "@/components/pages/EditReport";
import LoginPage from "@/components/pages/LoginPage";

import OwnerDashboard from "@/components/pages/OwnerDashboard";
import ReportDetails from "@/components/pages/ReportDetails";
import ReportHistory from "@/components/pages/ReportHistory";
import ReportsMonitor from "@/components/pages/ReportsMonitor";
import StrategicPlanning from "@/components/pages/StrategicPlanning";
import SubmitReport from "@/components/pages/SubmitReport";
import UserManagement from "@/components/pages/UserManagement";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ 2. KEMAS KINI KESELURUHAN 'useEffect' INI
  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("authToken");

      if (token) {
        try {
          // Buat panggilan API untuk mengesahkan token dan dapatkan data pengguna terkini
          // (Interceptor dalam 'api.js' akan letak token di header secara automatik)
          const res = await api.get("/users/me");

          // Jika berjaya, tetapkan pengguna dan kemas kini localStorage
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        } catch (error) {
          // Jika token tidak sah (cth: 401 error), interceptor dalam 'api.js'
          // akan mengendalikan pembersihan localStorage dan redirect ke login
          // Kita hanya perlu pastikan 'user' adalah null.
          console.error("Sesi tidak sah:", error.message);
          setUser(null);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      }
      // Selesai loading walaupun tiada token
      setLoading(false);
    };

    verifyUser();
  }, []); // <-- Kekalkan array kosong, ia hanya perlu dijalankan sekali semasa app load

  const handleLoginSuccess = (loggedInUser) => {
    // Fungsi ini sedia ada dan sudah betul
    setUser(loggedInUser);
    // Nota: LoginPage anda sepatutnya sudah menyimpan 'authToken' dan 'user' ke localStorage
  };

  const handleLogout = () => {
    // Fungsi ini sedia ada dan sudah betul
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  // ✅ 3. TAMBAH BAIK PAPARAN 'loading'
  if (loading) {
    // Tunjukkan spinner semasa kita mengesahkan token
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Jika belum login → tunjuk login page
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Tentukan jenis role (logik sedia ada anda)
  const isAdmin = user.role === "Admin";
  const isHybridRole = user.role === "Bahagian" || user.role === "Negeri";
  const isMonitorRole = isAdmin || isHybridRole; // Admin + (Bahagian/Negeri)
  const isReporter = user.role === "PPD" || user.role === "User";

  // Jika user dah login (logik sedia ada anda, kekal sama)
  return (
    <AppLayout onLogout={handleLogout} userRole={user.role} user={user}>
      <Routes>
        {/* Laluan Utama (Dashboard) - Berbeza ikut Role */}
        <Route
          path="/"
          element={
            // Admin terus ke DashboardOverview, semua yang lain ke OwnerDashboard
            isAdmin ? <DashboardOverview /> : <OwnerDashboard />
          }
        />

        {/* Laluan untuk "Pelapor" (PPD / User) DAN "Hybrid" (Negeri / Bahagian) */}
        {(isReporter || isMonitorRole) && (
          <>
            <Route path="/submit-report" element={<SubmitReport />} />
            <Route path="/report-history" element={<ReportHistory />} />
            <Route path="/edit-report/:id" element={<EditReport />} />

          </>
        )}

        {/* Laluan untuk "Pemantau" (Admin, Bahagian, Negeri) */}
        {isMonitorRole && (
          <>
            <Route path="/initiatives" element={<AllInitiatives />} />
            <Route path="/reports" element={<ReportsMonitor />} />
          </>
        )}

        {/* Laluan Admin SAHAJA */}
        {isAdmin && (
          <>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/planning" element={<StrategicPlanning />} />
          </>
        )}

        {/* Laluan Dikongsi oleh semua */}
        <Route path="/report/:id" element={<ReportDetails />} />

        {/* Laluan 'Catch-all' */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
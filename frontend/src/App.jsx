import api from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// --- Import Security Guard (WAJIB ADA) ---
import ProtectedRoute from "@/components/ProtectedRoute";

// --- Import Halaman ---
import AllInitiatives from "@/components/pages/AllInitiatives";
import ChangePasswordPage from "@/components/pages/ChangePasswordPage"; // Halaman Tukar Password
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

// --- Import Modul Enrolmen ---
import AdminAnnouncementPage from "@/components/pages/AdminAnnouncementPage";
import AdminEnrollmentExport from "@/components/pages/AdminEnrollmentExport";
import AdminEnrollmentImport from "@/components/pages/AdminEnrollmentImport";
import EnrollmentSettingsPage from "@/components/pages/EnrollmentSettingsPage";
import EnrollmentVerificationPage from "@/components/pages/EnrollmentVerificationPage";
import JPNEnrollmentDashboard from "@/components/pages/JPNEnrollmentDashboard";
import KPMEnrollmentDashboard from "@/components/pages/KPMEnrollmentDashboard";

// --- Import Modul Program ---
import ProgramReportsPage from "@/components/pages/ProgramReportsPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Semakan sesi pengguna semasa reload page
  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("authToken");

      if (token) {
        try {
          const res = await api.get("/users/me");
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));

          // ✅ Kemaskini status password setiap kali reload
          localStorage.setItem("mustChangePassword", res.data.mustChangePassword);

        } catch (error) {
          console.error("Sesi tidak sah:", error.message);
          setUser(null);
          localStorage.clear(); // Bersihkan semua jika token tak sah
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.clear(); // Bersihkan token & status password
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- KUMPULAN 1: Public Routes (Belum Login) ---
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />

        {/* ✅ WAJIB TAMBAH DI SINI (Sebelum route *) */}
        {/* Supaya user boleh akses page ini walaupun belum masuk Dashboard */}
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* Route Catch-all mesti paling bawah */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // --- Logik Role ---
  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isPPD = role === "ppd";
  const isUser = role === "user";
  const isNegeri = role === "negeri";
  const isBahagian = role === "bahagian";

  // Kumpulan Akses
  const isMonitorLegacy = isAdmin || isNegeri || isBahagian;
  const isReporter = isPPD || isUser || isNegeri || isBahagian;

  return (
    // ✅ AppLayout dibungkus di luar ProtectedRoute supaya Navbar sentiasa ada
    // ATAU anda boleh letak ProtectedRoute di dalam AppLayout. 
    // Di sini saya bungkus AppLayout di dalam ProtectedRoute untuk keselamatan maksimum.

    <AppLayout onLogout={handleLogout} userRole={user.role} user={user}>
      <Routes>

        {/* --- KUMPULAN 2: Route Khas Tukar Password --- */}
        {/* Route ini MESTI dilindungi tapi benarkan user "mustChangePassword" masuk */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* --- KUMPULAN 3: Protected Routes (Mesti Dah Tukar Password) --- */}

        {/* 1. Dashboard Utama */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {isAdmin ? <DashboardOverview /> : <OwnerDashboard />}
            </ProtectedRoute>
          }
        />

        {/* 2. Modul Pelaporan Inisiatif */}
        {(isReporter || isMonitorLegacy) && (
          <>
            <Route path="/submit-report" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
            <Route path="/report-history" element={<ProtectedRoute><ReportHistory /></ProtectedRoute>} />
            <Route path="/edit-report/:id" element={<ProtectedRoute><EditReport /></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute><ReportDetails /></ProtectedRoute>} />
          </>
        )}

        {isMonitorLegacy && (
          <>
            <Route path="/initiatives" element={<ProtectedRoute><AllInitiatives /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsMonitor /></ProtectedRoute>} />
          </>
        )}

        {/* 3. Modul Admin */}
        {isAdmin && (
          <>
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute><StrategicPlanning /></ProtectedRoute>} />

            {/* Admin Enrolmen */}
            <Route path="/enrollment/import" element={<ProtectedRoute><AdminEnrollmentImport /></ProtectedRoute>} />
            <Route path="/enrollment/export" element={<ProtectedRoute><AdminEnrollmentExport /></ProtectedRoute>} />
            <Route path="/enrollment/settings" element={<ProtectedRoute><EnrollmentSettingsPage /></ProtectedRoute>} />
            <Route path="/enrollment/kpm-dashboard" element={<ProtectedRoute><KPMEnrollmentDashboard /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncementPage /></ProtectedRoute>} />
          </>
        )}

        {/* 4. Modul Enrolmen (Khas PPD & Negeri) */}
        {(isPPD || isAdmin) && (
          <Route path="/enrollment/verify" element={<ProtectedRoute><EnrollmentVerificationPage /></ProtectedRoute>} />
        )}

        {(isNegeri || isAdmin) && (
          <Route path="/enrollment/jpn-dashboard" element={<ProtectedRoute><JPNEnrollmentDashboard /></ProtectedRoute>} />
        )}

        {/* 5. Modul Program Laporan Aktiviti (BARU) */}
        <Route path="/programs" element={<ProtectedRoute><ProgramReportsPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </AppLayout>
  );
}

export default App;
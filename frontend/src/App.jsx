import api from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// --- Import Halaman ---
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

// --- Import Modul Enrolmen ---
import AdminAnnouncementPage from "@/components/pages/AdminAnnouncementPage";
import AdminEnrollmentExport from "@/components/pages/AdminEnrollmentExport";
import AdminEnrollmentImport from "@/components/pages/AdminEnrollmentImport";
import EnrollmentSettingsPage from "@/components/pages/EnrollmentSettingsPage";
import EnrollmentVerificationPage from "@/components/pages/EnrollmentVerificationPage";
import JPNEnrollmentDashboard from "@/components/pages/JPNEnrollmentDashboard";
import KPMEnrollmentDashboard from "@/components/pages/KPMEnrollmentDashboard";

import ProgramReportsPage from "@/components/pages/ProgramReportsPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("authToken");

      if (token) {
        try {
          const res = await api.get("/users/me");
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        } catch (error) {
          console.error("Sesi tidak sah:", error.message);
          setUser(null);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
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
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // --- Logik Role (Diperbetulkan) ---
  const role = (user.role || "").toLowerCase();

  const isAdmin = role === "admin";
  const isPPD = role === "ppd";
  const isUser = role === "user"; // ✅ DITAMBAH: Definisi isUser
  const isNegeri = role === "negeri"; // JPN sebenar
  const isBahagian = role === "bahagian"; // Kementerian/Bahagian Khas

  // Kumpulan Gabungan
  // isMonitorLegacy merangkumi Admin, JPN, Bahagian untuk modul lama
  const isMonitorLegacy = isAdmin || isNegeri || isBahagian;

  // isReporter merangkumi sesiapa yang perlu hantar laporan inisiatif
  const isReporter = isPPD || isUser || isNegeri || isBahagian;

  return (
    <AppLayout onLogout={handleLogout} userRole={user.role} user={user}>
      <Routes>
        {/* 1. Dashboard Utama */}
        <Route
          path="/"
          element={isAdmin ? <DashboardOverview /> : <OwnerDashboard />}
        />

        {/* 2. Modul Pelaporan Inisiatif (Akses untuk semua termasuk Bahagian) */}
        {(isReporter || isMonitorLegacy) && (
          <>
            <Route path="/submit-report" element={<SubmitReport />} />
            <Route path="/report-history" element={<ReportHistory />} />
            <Route path="/edit-report/:id" element={<EditReport />} />
            <Route path="/report/:id" element={<ReportDetails />} />
          </>
        )}

        {isMonitorLegacy && (
          <>
            <Route path="/initiatives" element={<AllInitiatives />} />
            <Route path="/reports" element={<ReportsMonitor />} />
          </>
        )}

        {/* 3. Modul Admin */}
        {isAdmin && (
          <>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/planning" element={<StrategicPlanning />} />

            <Route path="/enrollment/import" element={<AdminEnrollmentImport />} />
            <Route path="/enrollment/export" element={<AdminEnrollmentExport />} />
            <Route path="/enrollment/settings" element={<EnrollmentSettingsPage />} />
            <Route path="/enrollment/kpm-dashboard" element={<KPMEnrollmentDashboard />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementPage />} />
          </>
        )}

        {/* 4. Modul Enrolmen (KHAS: PPD & NEGERI SAHAJA) */}
        {/* Bahagian TIDAK BOLEH akses laluan ini */}

        {(isPPD || isAdmin) && (
          <Route path="/enrollment/verify" element={<EnrollmentVerificationPage />} />
        )}

        {(isNegeri || isAdmin) && (
          <Route path="/enrollment/jpn-dashboard" element={<JPNEnrollmentDashboard />} />
        )}

        {/* Laluan 'Catch-all' */}
        <Route path="*" element={<Navigate to="/" />} />

        <Route path="/programs" element={<ProgramReportsPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
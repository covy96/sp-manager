import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import AppLayout from "./components/AppLayout";
import CalendarioPage from "./pages/CalendarioPage";
import ClientiPage from "./pages/ClientiPage";
import CommessaDetailPage from "./pages/CommessaDetailPage";
import CommessePage from "./pages/CommessePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MonitoraggioCommessePage from "./pages/MonitoraggioCommessePage";
import MyTasksPage from "./pages/MyTasksPage";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectsPage from "./pages/ProjectsPage";
import ReportPage from "./pages/ReportPage";
import ProformaPage from "./pages/ProformaPage";
import SectionPage from "./pages/SectionPage";
import TeamPage from "./pages/TeamPage";
import TimesheetPage from "./pages/TimesheetPage";

// Settings pages
import ProfiloPage from "./pages/settings/ProfiloPage";
import AspettoPage from "./pages/settings/AspettoPage";
import GestioneUtentiPage from "./pages/settings/GestioneUtentiPage";
import GestioneServiziPage from "./pages/settings/GestioneServiziPage";
import SettingsClientiPage from "./pages/settings/ClientiPage";
import SettingsProgettiArchiviatiPage from "./pages/settings/ProgettiArchiviatiPage";
import SettingsCommesseArchiviatePage from "./pages/settings/CommesseArchiviatePage";

import { supabase } from "./lib/supabase";

function ProtectedLayout({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageTitleProvider>
      <AppLayout session={session}>{children}</AppLayout>
    </PageTitleProvider>
  );
}

function OnboardingGuard({ session, children }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setChecking(false);
      return;
    }
    const check = async () => {
      const { data: tm } = await supabase
        .from("team_members")
        .select("id, studio")
        .eq("user_account", session.user.id)
        .maybeSingle();
      const hasStudio = tm != null && tm.studio != null && tm.studio !== "";
      setChecking(false);
      if (!hasStudio) {
        navigate("/onboarding", { replace: true });
      }
    };
    check();
  }, [session, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }
  return children;
}

export default function App({ session }) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage session={session} />} />
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route path="/register" element={<RegisterPage session={session} />} />
      <Route
        path="/onboarding"
        element={
          session ? <OnboardingPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}>
              <DashboardPage />
            </OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/progetti"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProjectsPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/progetti/:id"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProjectDetailPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/commesse"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><CommessePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/commesse/:id"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><CommessaDetailPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/clienti"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ClientiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/calendario"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><CalendarioPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><TimesheetPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/gantt-progetti"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><SectionPage title="Gantt Progetti" /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><TeamPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ReportPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/monitoraggio-commesse"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><MonitoraggioCommessePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/proforma"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProformaPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/le-mie-task"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><MyTasksPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      {/* Settings Routes */}
      <Route
        path="/impostazioni"
        element={<Navigate to="/impostazioni/profilo" replace />}
      />
      <Route
        path="/impostazioni/profilo"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProfiloPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/aspetto"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><AspettoPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/utenti"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><GestioneUtentiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/servizi"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><GestioneServiziPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/clienti"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><SettingsClientiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/progetti-archiviati"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><SettingsProgettiArchiviatiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/commesse-archiviate"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><SettingsCommesseArchiviatePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

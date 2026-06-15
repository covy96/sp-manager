import { useEffect, useState, Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#dc2626" }}>
          <strong>Errore nell'app:</strong><br />
          {this.state.error?.message}<br /><br />
          <button onClick={() => this.setState({ error: null })} style={{ padding: "6px 14px", cursor: "pointer" }}>
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import GanttPage from "./pages/GanttPage";
import AnalisiPage from "./pages/AnalisiPage";
import AnalisiOffertePage from "./pages/AnalisiOffertePage";
import AnalisiHubPage from "./pages/AnalisiHubPage";
import OffertePage from "./pages/OffertePage";
import OfferteDetailPage from "./pages/OfferteDetailPage";
import ScrivaniaPage from "./pages/ScrivaniaPage";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectsPage from "./pages/ProjectsPage";
import ReportPage from "./pages/ReportPage";
import ProformaPage from "./pages/ProformaPage";
import FatturePage from "./pages/FatturePage";
import SectionPage from "./pages/SectionPage";
import TeamPage from "./pages/TeamPage";
import TimesheetPage from "./pages/TimesheetPage";

// Settings pages
import ProfiloPage from "./pages/settings/ProfiloPage";
import AspettoPage from "./pages/settings/AspettoPage";
import GestioneServiziPage from "./pages/settings/GestioneServiziPage";
import VociOffertaPage from "./pages/settings/VociOffertaPage";
import SettingsClientiPage from "./pages/settings/ClientiPage";
import SettingsProgettiArchiviatiPage from "./pages/settings/ProgettiArchiviatiPage";
import SettingsCommesseArchiviatePage from "./pages/settings/CommesseArchiviatePage";
import NotifichePage from "./pages/settings/NotifichePage";
import ReportImpostazioniPage from "./pages/settings/ReportImpostazioniPage";
import PianoPage from "./pages/settings/PianoPage";
import ProfiloStudioPage from "./pages/settings/ProfiloStudioPage";
import CestinoPage from "./pages/settings/CestinoPage";
import EsportaDatiPage from "./pages/settings/EsportaDatiPage";
import ProgettoArchiviotoRecapPage from "./pages/settings/ProgettoArchiviotoRecapPage";
import CommessaArchiviataRecapPage from "./pages/settings/CommessaArchiviataRecapPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CreateStudioPage from "./pages/CreateStudioPage";
import JoinStudioPage from "./pages/JoinStudioPage";
import PrivacyPage from "./pages/PrivacyPage";
import TerminiPage from "./pages/TerminiPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import DpaPage from "./pages/DpaPage";
import InfoPage from "./pages/InfoPage";
import StudioCancellatoPage from "./pages/StudioCancellatoPage";
import { useStudio } from "./hooks/useStudio";
import CookieBanner from "./components/CookieBanner";

import { supabase } from "./lib/supabase";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";

// Se lo studio è stato cancellato (in retention), l'utente può accedere
// SOLO alla pagina di recupero/esportazione dati: tutte le altre route
// vengono dirottate lì finché i dati non vengono purgati.
function StudioRecoveryGate({ children }) {
  const { studioDeleted } = useStudio();
  // Ottimistico: mentre carica mostriamo l'app normale (nessuno spinner extra
  // per gli utenti normali a ogni navigazione). Solo a cancellazione confermata
  // dirottiamo sulla pagina di recupero dati.
  if (studioDeleted) return <StudioCancellatoPage />;
  return children;
}

function ProtectedLayout({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageTitleProvider>
      <StudioRecoveryGate>
        <AppLayout session={session}>{children}</AppLayout>
      </StudioRecoveryGate>
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
  const navigate = useNavigate();

  // Su mobile (PWA), se non c'è sessione salta la landing e vai direttamente al login
  const isPwa    = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isMobile = window.innerWidth < 768;
  const skipLanding = (isPwa || isMobile) && !session;

  return (
    <ThemeProvider>
    <ToastProvider>
    <ErrorBoundary>
    <CookieBanner />
    <Routes>
      <Route
        path="/"
        element={
          session
            ? <Navigate to="/dashboard" replace />
            : skipLanding
              ? <Navigate to="/login" replace />
              : <LandingPage
                  onLogin={() => navigate("/login")}
                  onRegister={() => navigate("/crea-studio")}
                  onJoin={() => navigate("/unisciti")}
                />
        }
      />
      <Route
        path="/landing"
        element={
          <LandingPage
            onLogin={() => navigate("/login")}
            onRegister={() => navigate("/crea-studio")}
            onJoin={() => navigate("/unisciti")}
          />
        }
      />
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route path="/register" element={<RegisterPage session={session} />} />
      <Route path="/crea-studio" element={<CreateStudioPage session={session} />} />
      <Route path="/unisciti" element={<JoinStudioPage session={session} />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
        path="/offerte"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><OffertePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/offerte/:id"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><OfferteDetailPage /></OnboardingGuard>
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
            <OnboardingGuard session={session}><GanttPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/analisi"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><AnalisiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/analisi-offerte"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><AnalisiOffertePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/analisi-hub"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><AnalisiHubPage /></OnboardingGuard>
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
        path="/fatture"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><FatturePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route path="/le-mie-task" element={<Navigate to="/scrivania" replace />} />
      <Route
        path="/scrivania"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ScrivaniaPage /></OnboardingGuard>
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
        path="/impostazioni/piano"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><PianoPage /></OnboardingGuard>
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
      <Route path="/impostazioni/utenti" element={<Navigate to="/team" replace />} />
      <Route
        path="/impostazioni/servizi"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><GestioneServiziPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/voci-offerta"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><VociOffertaPage /></OnboardingGuard>
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
      <Route
        path="/impostazioni/notifiche"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><NotifichePage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/report"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ReportImpostazioniPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/profilo-studio"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProfiloStudioPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/esporta"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><EsportaDatiPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/cestino"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><CestinoPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/progetti-archiviati/:id"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><ProgettoArchiviotoRecapPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route
        path="/impostazioni/commesse-archiviate/:id"
        element={
          <ProtectedLayout session={session}>
            <OnboardingGuard session={session}><CommessaArchiviataRecapPage /></OnboardingGuard>
          </ProtectedLayout>
        }
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/termini" element={<TerminiPage />} />
      <Route path="/cookie-policy" element={<CookiePolicyPage />} />
      <Route path="/dpa" element={<DpaPage />} />
      <Route path="/info" element={<ProtectedLayout session={session}><InfoPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </ErrorBoundary>
    </ToastProvider>
    </ThemeProvider>
  );
}

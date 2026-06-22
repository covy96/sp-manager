import { useEffect, useState, Component, lazy, Suspense } from "react";

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

// Pagine caricate on-demand (code-splitting) per ridurre il bundle iniziale
const CalendarioPage = lazy(() => import("./pages/CalendarioPage"));
const ClientiPage = lazy(() => import("./pages/ClientiPage"));
const CommessaDetailPage = lazy(() => import("./pages/CommessaDetailPage"));
const CommessePage = lazy(() => import("./pages/CommessePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MonitoraggioCommessePage = lazy(() => import("./pages/MonitoraggioCommessePage"));
const GanttPage = lazy(() => import("./pages/GanttPage"));
const AnalisiPage = lazy(() => import("./pages/AnalisiPage"));
const AnalisiOffertePage = lazy(() => import("./pages/AnalisiOffertePage"));
const AnalisiHubPage = lazy(() => import("./pages/AnalisiHubPage"));
const OffertePage = lazy(() => import("./pages/OffertePage"));
const OfferteDetailPage = lazy(() => import("./pages/OfferteDetailPage"));
const ScrivaniaPage = lazy(() => import("./pages/ScrivaniaPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const ProformaPage = lazy(() => import("./pages/ProformaPage"));
const FatturePage = lazy(() => import("./pages/FatturePage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const TimesheetPage = lazy(() => import("./pages/TimesheetPage"));

// Settings pages
const ProfiloPage = lazy(() => import("./pages/settings/ProfiloPage"));
const AspettoPage = lazy(() => import("./pages/settings/AspettoPage"));
const GestioneServiziPage = lazy(() => import("./pages/settings/GestioneServiziPage"));
const VociOffertaPage = lazy(() => import("./pages/settings/VociOffertaPage"));
const SettingsClientiPage = lazy(() => import("./pages/settings/ClientiPage"));
const SettingsProgettiArchiviatiPage = lazy(() => import("./pages/settings/ProgettiArchiviatiPage"));
const SettingsCommesseArchiviatePage = lazy(() => import("./pages/settings/CommesseArchiviatePage"));
const NotifichePage = lazy(() => import("./pages/settings/NotifichePage"));
const ReportImpostazioniPage = lazy(() => import("./pages/settings/ReportImpostazioniPage"));
const PianoPage = lazy(() => import("./pages/settings/PianoPage"));
const ProfiloStudioPage = lazy(() => import("./pages/settings/ProfiloStudioPage"));
const CestinoPage = lazy(() => import("./pages/settings/CestinoPage"));
const EsportaDatiPage = lazy(() => import("./pages/settings/EsportaDatiPage"));
const ProgettoArchiviotoRecapPage = lazy(() => import("./pages/settings/ProgettoArchiviotoRecapPage"));
const CommessaArchiviataRecapPage = lazy(() => import("./pages/settings/CommessaArchiviataRecapPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const CreateStudioPage = lazy(() => import("./pages/CreateStudioPage"));
const JoinStudioPage = lazy(() => import("./pages/JoinStudioPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TerminiPage = lazy(() => import("./pages/TerminiPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const DpaPage = lazy(() => import("./pages/DpaPage"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const StudioCancellatoPage = lazy(() => import("./pages/StudioCancellatoPage"));
const PreventiviPage = lazy(() => import("./pages/preventivi/PreventiviPage"));
const PreventivoConfigPage = lazy(() => import("./pages/preventivi/PreventivoConfigPage"));
const PreventivoNuovoPage = lazy(() => import("./pages/preventivi/PreventivoNuovoPage"));
const PreventivoDetailPage = lazy(() => import("./pages/preventivi/PreventivoDetailPage"));
import { useStudio } from "./hooks/useStudio";
import { useFeatureFlag } from "./hooks/useFeatureFlag";
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

function FlagGatedRoute({ flag, children }) {
  const { enabled, loading } = useFeatureFlag(flag);
  if (loading) return null;
  if (!enabled) return <Navigate to="/dashboard" replace />;
  return children;
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

  // Prefetch on-idle dei chunk delle pagine d'uso quotidiano: il bundle iniziale
  // resta piccolo, ma i chunk sono già in cache quando l'utente naviga → nessuno
  // sfarfallio dello spinner. Le pagine pesanti (Gantt/Report/Analisi/Export)
  // restano on-demand.
  useEffect(() => {
    if (!session) return;
    const warm = () => {
      import("./pages/DashboardPage");
      import("./pages/ProjectsPage");
      import("./pages/ProjectDetailPage");
      import("./pages/CommessePage");
      import("./pages/CommessaDetailPage");
      import("./pages/ScrivaniaPage");
      import("./pages/CalendarioPage");
      import("./pages/TimesheetPage");
      import("./pages/ClientiPage");
      import("./pages/OffertePage");
      import("./pages/TeamPage");
      import("./pages/settings/ProfiloPage");
    };
    const ric = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const id = ric(warm);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [session]);

  return (
    <ThemeProvider>
    <ToastProvider>
    <ErrorBoundary>
    <CookieBanner />
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    }>
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
      {/* Preventivi (beta) */}
      <Route path="/preventivi" element={<ProtectedLayout session={session}><OnboardingGuard session={session}><FlagGatedRoute flag="preventivo_beta"><PreventiviPage /></FlagGatedRoute></OnboardingGuard></ProtectedLayout>} />
      <Route path="/preventivi/config" element={<ProtectedLayout session={session}><OnboardingGuard session={session}><FlagGatedRoute flag="preventivo_beta"><PreventivoConfigPage /></FlagGatedRoute></OnboardingGuard></ProtectedLayout>} />
      <Route path="/preventivi/nuovo" element={<ProtectedLayout session={session}><OnboardingGuard session={session}><FlagGatedRoute flag="preventivo_beta"><PreventivoNuovoPage /></FlagGatedRoute></OnboardingGuard></ProtectedLayout>} />
      <Route path="/preventivi/:id" element={<ProtectedLayout session={session}><OnboardingGuard session={session}><FlagGatedRoute flag="preventivo_beta"><PreventivoDetailPage /></FlagGatedRoute></OnboardingGuard></ProtectedLayout>} />

      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/termini" element={<TerminiPage />} />
      <Route path="/cookie-policy" element={<CookiePolicyPage />} />
      <Route path="/dpa" element={<DpaPage />} />
      <Route path="/info" element={<ProtectedLayout session={session}><InfoPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
    </ToastProvider>
    </ThemeProvider>
  );
}

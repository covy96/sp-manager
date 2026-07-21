import { useEffect, useState, Component, lazy, Suspense } from "react";
import { Sentry } from "./lib/sentry";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    Sentry.captureException(error, { extra: info });
  }
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

// Dopo un nuovo deploy l'index.html in cache punta a chunk con hash vecchi
// che non esistono più: il dynamic import fallisce ("Failed to fetch dynamically
// imported module"). In quel caso forziamo UN solo reload per prendere il nuovo
// index.html. La guardia in sessionStorage evita loop di ricaricamenti.
function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      const mod = await importFn();
      sessionStorage.removeItem("chunk-reload");
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem("chunk-reload")) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return new Promise(() => {}); // sospende il render finché la pagina ricarica
      }
      throw err;
    }
  });
}
if (typeof window !== "undefined") {
  // Evento ufficiale Vite: fallimento nel precaricare un modulo (chunk mancante)
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    if (!sessionStorage.getItem("chunk-reload")) {
      sessionStorage.setItem("chunk-reload", "1");
      window.location.reload();
    }
  });
}

// Pagine caricate on-demand (code-splitting) per ridurre il bundle iniziale
const CalendarioPage = lazyWithRetry(() => import("./pages/CalendarioPage"));
const ClientiPage = lazyWithRetry(() => import("./pages/ClientiPage"));
const CommessaDetailPage = lazyWithRetry(() => import("./pages/CommessaDetailPage"));
const CommessePage = lazyWithRetry(() => import("./pages/CommessePage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const LoginPage = lazyWithRetry(() => import("./pages/LoginPage"));
const MonitoraggioCommessePage = lazyWithRetry(() => import("./pages/MonitoraggioCommessePage"));
const GanttPage = lazyWithRetry(() => import("./pages/GanttPage"));
const AnalisiPage = lazyWithRetry(() => import("./pages/AnalisiPage"));
const AnalisiOffertePage = lazyWithRetry(() => import("./pages/AnalisiOffertePage"));
const AnalisiHubPage = lazyWithRetry(() => import("./pages/AnalisiHubPage"));
const OffertePage = lazyWithRetry(() => import("./pages/OffertePage"));
const OfferteDetailPage = lazyWithRetry(() => import("./pages/OfferteDetailPage"));
const ScrivaniaPage = lazyWithRetry(() => import("./pages/ScrivaniaPage"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const OnboardingPage = lazyWithRetry(() => import("./pages/OnboardingPage"));
const ProjectDetailPage = lazyWithRetry(() => import("./pages/ProjectDetailPage"));
const RegisterPage = lazyWithRetry(() => import("./pages/RegisterPage"));
const ProjectsPage = lazyWithRetry(() => import("./pages/ProjectsPage"));
const ReportPage = lazyWithRetry(() => import("./pages/ReportPage"));
const ProformaPage = lazyWithRetry(() => import("./pages/ProformaPage"));
const FatturePage = lazyWithRetry(() => import("./pages/FatturePage"));
const TeamPage = lazyWithRetry(() => import("./pages/TeamPage"));
const TimesheetPage = lazyWithRetry(() => import("./pages/TimesheetPage"));

// Settings pages
const ProfiloPage = lazyWithRetry(() => import("./pages/settings/ProfiloPage"));
const AspettoPage = lazyWithRetry(() => import("./pages/settings/AspettoPage"));
const GestioneServiziPage = lazyWithRetry(() => import("./pages/settings/GestioneServiziPage"));
const VociOffertaPage = lazyWithRetry(() => import("./pages/settings/VociOffertaPage"));
const SettingsClientiPage = lazyWithRetry(() => import("./pages/settings/ClientiPage"));
const SettingsProgettiArchiviatiPage = lazyWithRetry(() => import("./pages/settings/ProgettiArchiviatiPage"));
const SettingsCommesseArchiviatePage = lazyWithRetry(() => import("./pages/settings/CommesseArchiviatePage"));
const NotifichePage = lazyWithRetry(() => import("./pages/settings/NotifichePage"));
const ReportImpostazioniPage = lazyWithRetry(() => import("./pages/settings/ReportImpostazioniPage"));
const PianoPage = lazyWithRetry(() => import("./pages/settings/PianoPage"));
const ProfiloStudioPage = lazyWithRetry(() => import("./pages/settings/ProfiloStudioPage"));
const CestinoPage = lazyWithRetry(() => import("./pages/settings/CestinoPage"));
const EsportaDatiPage = lazyWithRetry(() => import("./pages/settings/EsportaDatiPage"));
const ProgettoArchiviotoRecapPage = lazyWithRetry(() => import("./pages/settings/ProgettoArchiviotoRecapPage"));
const CommessaArchiviataRecapPage = lazyWithRetry(() => import("./pages/settings/CommessaArchiviataRecapPage"));
const AuthCallbackPage = lazyWithRetry(() => import("./pages/AuthCallbackPage"));
const CreateStudioPage = lazyWithRetry(() => import("./pages/CreateStudioPage"));
const JoinStudioPage = lazyWithRetry(() => import("./pages/JoinStudioPage"));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const TerminiPage = lazyWithRetry(() => import("./pages/TerminiPage"));
const CookiePolicyPage = lazyWithRetry(() => import("./pages/CookiePolicyPage"));
const DpaPage = lazyWithRetry(() => import("./pages/DpaPage"));
const InfoPage = lazyWithRetry(() => import("./pages/InfoPage"));
const StudioCancellatoPage = lazyWithRetry(() => import("./pages/StudioCancellatoPage"));
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

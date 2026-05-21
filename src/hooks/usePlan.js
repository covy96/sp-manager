import { useStudio } from "./useStudio";

// ── DEFINIZIONE PIANI ─────────────────────────────────────────────
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: "€0",
    period: "/mese",
    description: "Per iniziare",
    maxUsers: 1,
    maxExternalUsers: 1,
    maxProjects: 5,
    maxCommesse: 5,
    features: [
      "1 utente interno",
      "1 collaboratore esterno",
      "5 progetti",
      "5 commesse",
      "Task e timesheet",
      "Calendario",
      "Gestione commesse completa",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: "€14,99",
    period: "/mese",
    description: "Per studi in crescita",
    maxUsers: 10,
    maxExternalUsers: 10,
    maxProjects: 25,
    maxCommesse: 25,
    features: [
      "Fino a 10 utenti",
      "25 progetti",
      "25 commesse",
      "Report avanzati",
      "Monitoraggio commesse",
      "Monitoraggio, proforma e fatture",
      "Supporto prioritario",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "€29,99",
    period: "/mese",
    description: "Per studi professionali",
    maxUsers: Infinity,
    maxExternalUsers: Infinity,
    maxProjects: Infinity,
    maxCommesse: Infinity,
    features: [
      "Utenti illimitati",
      "Progetti illimitati",
      "Commesse illimitate",
      "Tutto di Studio",
      "Gantt avanzato",
      "Account manager dedicato",
      "Backup su richiesta",
    ],
  },
};

// ── HOOK ─────────────────────────────────────────────────────────
export function usePlan() {
  const { studio } = useStudio();
  const pianoId = studio?.piano || "free";
  const plan = PLANS[pianoId] || PLANS.free;

  return {
    pianoId,
    plan,
    isFree:   pianoId === "free",
    isStudio: pianoId === "studio",
    isPro:    pianoId === "pro",

    // Helpers limiti
    canAddUser:      (currentCount) => currentCount < plan.maxUsers,
    canAddProject:   (currentCount) => currentCount < plan.maxProjects,
    canAddCommessa:  (currentCount) => currentCount < plan.maxCommesse,

    // Messaggi di errore
    limitMessage: (type) => {
      switch(type) {
        case "users":     return `Piano ${plan.name}: massimo ${plan.maxUsers === Infinity ? "illimitati" : plan.maxUsers} utenti. Fai l'upgrade per aggiungerne altri.`;
        case "projects":  return `Piano ${plan.name}: massimo ${plan.maxProjects === Infinity ? "illimitati" : plan.maxProjects} progetti. Fai l'upgrade per crearne altri.`;
        case "commesse":  return `Piano ${plan.name}: massimo ${plan.maxCommesse === Infinity ? "illimitate" : plan.maxCommesse} commesse. Fai l'upgrade per crearne altre.`;
        default:          return "Limite del piano raggiunto. Fai l'upgrade per continuare.";
      }
    },
  };
}

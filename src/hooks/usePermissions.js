import { useStudio } from "./useStudio";

// ── RUOLI DISPONIBILI ─────────────────────────────────────────────
// Valori esatti salvati in DB su team_members.role_internal
export const ROLE_OPTIONS = [
  "Owner",
  "Partner",
  "Project Manager",
  "Architetto",
  "Ingegnere",
  "Collaboratore Interno",
  "Collaboratore Esterno",
];

export const ROLE_LABELS = {
  "Owner":                 "Titolare",
  "Partner":               "Partner",
  "Project Manager":       "Project Manager",
  "Architetto":            "Architetto",
  "Ingegnere":             "Ingegnere",
  "Collaboratore Interno": "Collaboratore Interno",
  "Collaboratore Esterno": "Collaboratore Esterno",
};

export const ROLE_DESCRIPTIONS = {
  "Owner":                 "Accesso completo, gestione studio e utenti",
  "Partner":               "Accesso completo come il Titolare",
  "Project Manager":       "Gestione progetti, commesse e finanziari",
  "Architetto":            "Progetti, task e timesheet",
  "Ingegnere":             "Progetti, task e timesheet",
  "Collaboratore Interno": "Task e timesheet",
  "Collaboratore Esterno": "Task e timesheet",
};

// ── PERMESSI PER RUOLO ────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  "Owner": {
    isOwner: true, isProjectManager: true, isMember: true,
    canViewProjects: true,
    canManageUsers: true, canManageSettings: true, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: true,
    canDeleteAnything: true, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
    canViewReportCantiere: true, canManageReportCantiere: true,
  },
  "Partner": {
    isOwner: false, isProjectManager: true, isMember: true,
    canViewProjects: true,
    canManageUsers: true, canManageSettings: true, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: true,
    canDeleteAnything: true, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
    canViewReportCantiere: true, canManageReportCantiere: true,
  },
  "Project Manager": {
    isOwner: false, isProjectManager: true, isMember: true,
    canViewProjects: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
    canViewReportCantiere: true, canManageReportCantiere: true,
  },
  "Architetto": {
    isOwner: false, isProjectManager: false, isMember: true,
    canViewProjects: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
    canViewReportCantiere: true, canManageReportCantiere: false,
  },
  "Ingegnere": {
    isOwner: false, isProjectManager: false, isMember: true,
    canViewProjects: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
    canViewReportCantiere: true, canManageReportCantiere: false,
  },
  "Collaboratore Interno": {
    isOwner: false, isProjectManager: false, isMember: true,
    canViewProjects: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
    canViewReportCantiere: true, canManageReportCantiere: false,
  },
  "Collaboratore Esterno": {
    isOwner: false, isProjectManager: false, isMember: true,
    canViewProjects: false,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
    canViewReportCantiere: true, canManageReportCantiere: false,
  },
};

const DEFAULT_PERMISSIONS = {
  isOwner: false, isProjectManager: false, isMember: true,
  canViewProjects: true,
  canManageUsers: false, canManageSettings: false, canViewFinancials: false,
  canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
  canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
  canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
  canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
  canViewReportCantiere: true, canManageReportCantiere: false,
};

// ── SEZIONI PERMESSI GRANULARI ────────────────────────────────────
// Usato nella UI di TeamPage per la tab "Permessi"
export const PERMISSION_SECTIONS = [
  {
    label: "Progetti",
    perms: [
      { key: "canViewProjects",    label: "Vedere" },
      { key: "canCreateProjects",  label: "Creare" },
      { key: "canEditProjects",    label: "Modificare" },
      { key: "canArchiveProjects", label: "Archiviare" },
    ],
  },
  {
    label: "Commesse",
    perms: [
      { key: "canViewCommesse",   label: "Vedere" },
      { key: "canManageCommesse", label: "Creare / Modificare" },
    ],
  },
  {
    label: "Finanziari (Proforma / Fatture)",
    perms: [
      { key: "canViewFinancials", label: "Vedere" },
    ],
  },
  {
    label: "Report & Monitoraggio",
    perms: [
      { key: "canViewReport",              label: "Report" },
      { key: "canViewMonitoraggio",        label: "Monitoraggio commesse" },
      { key: "canViewReportCantiere",      label: "Report di cantiere — Vedere" },
      { key: "canManageReportCantiere",    label: "Report di cantiere — Creare / Modificare / Eliminare" },
    ],
  },
  {
    label: "Timesheet",
    perms: [
      { key: "canCompleteOwnTask",    label: "Inserire proprio timesheet" },
      { key: "canViewAllTimesheets",  label: "Vedere timesheet team" },
    ],
  },
  {
    label: "Task",
    perms: [
      { key: "canEditTask",    label: "Modificare task" },
      { key: "canAssignTasks", label: "Assegnare task ad altri" },
    ],
  },
  {
    label: "Gestione Studio",
    perms: [
      { key: "canManageUsers",    label: "Gestire utenti" },
      { key: "canManageSettings", label: "Impostazioni studio" },
      { key: "canDeleteAnything", label: "Eliminare contenuti" },
    ],
  },
];

export function usePermissions() {
  const { teamMember, studio, user } = useStudio();
  const role = teamMember?.role_internal;

  // Fallback: se l'utente è il proprietario dello studio ma il ruolo non è settato
  if (!role && studio?.owner_id && user?.id && studio.owner_id === user.id) {
    return ROLE_PERMISSIONS["Owner"];
  }

  const rolePerms = ROLE_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS;

  // Applica permessi personalizzati sovrascrivendo il ruolo
  const custom = teamMember?.custom_permissions;
  if (custom && typeof custom === 'object') {
    return { ...rolePerms, ...custom };
  }

  return rolePerms;
}

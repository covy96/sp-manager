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
    canManageUsers: true, canManageSettings: true, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: true,
    canDeleteAnything: true, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
  },
  "Partner": {
    isOwner: false, isProjectManager: true, isMember: true,
    canManageUsers: true, canManageSettings: true, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: true,
    canDeleteAnything: true, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
  },
  "Project Manager": {
    isOwner: false, isProjectManager: true, isMember: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: true,
    canCreateProjects: true, canEditProjects: true, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: true, canViewAllTimesheets: true,
    canViewReport: true, canViewCommesse: true, canViewMonitoraggio: true,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: true,
  },
  "Architetto": {
    isOwner: false, isProjectManager: false, isMember: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
  },
  "Ingegnere": {
    isOwner: false, isProjectManager: false, isMember: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
  },
  "Collaboratore Interno": {
    isOwner: false, isProjectManager: false, isMember: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
  },
  "Collaboratore Esterno": {
    isOwner: false, isProjectManager: false, isMember: true,
    canManageUsers: false, canManageSettings: false, canViewFinancials: false,
    canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
    canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
    canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
    canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
  },
};

const DEFAULT_PERMISSIONS = {
  isOwner: false, isProjectManager: false, isMember: true,
  canManageUsers: false, canManageSettings: false, canViewFinancials: false,
  canCreateProjects: false, canEditProjects: false, canArchiveProjects: false,
  canDeleteAnything: false, canAssignTasks: false, canViewAllTimesheets: false,
  canViewReport: false, canViewCommesse: false, canViewMonitoraggio: false,
  canEditTask: true, canCompleteOwnTask: true, canManageCommesse: false,
};

export function usePermissions() {
  const { teamMember } = useStudio();
  const role = teamMember?.role_internal;
  return ROLE_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS;
}

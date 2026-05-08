import { useStudio } from "./useStudio";

export function usePermissions() {
  const { teamMember } = useStudio();
  const role = teamMember?.role_internal;

  return {
    isOwner: role === "Owner",
    isProjectManager: role === "Owner" || role === "Project Manager",
    isMember: true,

    canManageUsers: role === "Owner",
    canManageSettings: role === "Owner",
    canViewFinancials: role === "Owner" || role === "Project Manager",
    canCreateProjects: role === "Owner" || role === "Project Manager",
    canEditProjects: role === "Owner" || role === "Project Manager",
    canArchiveProjects: role === "Owner",
    canDeleteAnything: role === "Owner",
    canAssignTasks: role === "Owner" || role === "Project Manager",
    canViewAllTimesheets: role === "Owner" || role === "Project Manager",
    canViewReport: role === "Owner" || role === "Project Manager",
    canViewCommesse: role === "Owner" || role === "Project Manager",
    canViewMonitoraggio: role === "Owner" || role === "Project Manager",
    canEditTask: role === "Owner" || role === "Project Manager",
    canCompleteOwnTask: true,
  };
}

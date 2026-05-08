import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

const ROLE_OPTIONS = ["Owner", "Project Manager", "Member"];
const LEGACY_ROLE_OPTIONS = ["Architetto", "Collaboratore", "Titolare", "Stagista"];

const ALL_TABS = [
  { id: "profilo", label: "Profilo" },
  { id: "aspetto", label: "Aspetto" },
  { id: "studio", label: "Il mio Studio" },
  { id: "utenti", label: "Gestione Utenti", adminOnly: true },
  { id: "servizi", label: "Gestione Servizi" },
  { id: "clienti", label: "Clienti" },
  { id: "progetti-archiviati", label: "Progetti Archiviati" },
  { id: "commesse-archiviate", label: "Commesse Archiviate" },
  { id: "esci", label: "Esci" },
];

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#48484a] px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { studioId } = useStudio();
  const permissions = usePermissions();
  const [selectedTab, setSelectedTab] = useState("profilo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  const [members, setMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [archivedCommesse, setArchivedCommesse] = useState([]);
  const [studio, setStudio] = useState(null);
  const [studioName, setStudioName] = useState("");
  const [studioSaving, setStudioSaving] = useState(false);
  const [studioMessage, setStudioMessage] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceName, setEditingServiceName] = useState("");

  const [memberForm, setMemberForm] = useState({
    user_name: "",
    user_email: "",
    role_internal: ROLE_OPTIONS[0],
  });
  const [serviceForm, setServiceForm] = useState({ service_name: "" });
  const [clientForm, setClientForm] = useState({
    full_name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    if (!studioId) return;
    setLoading(true);
    setError("");

    const [{ data: authData, error: authError }, membersRes, servicesRes, contactsRes, projectsRes, commesseRes] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase.from("team_members").select("*").eq("studio", studioId).order("user_name", { ascending: true }),
        supabase.from("service_task_templates").select("*").order("order", { ascending: true }),
        supabase.from("global_contacts").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("studio", studioId).eq("archived", true).order("created_at", { ascending: false }),
        supabase.from("commesse").select("*").eq("studio", studioId).eq("archived", true).order("created_at", { ascending: false }),
      ]);

    if (
      authError ||
      membersRes.error ||
      servicesRes.error ||
      contactsRes.error ||
      projectsRes.error ||
      commesseRes.error
    ) {
      setError(
        authError?.message ||
          membersRes.error?.message ||
          servicesRes.error?.message ||
          contactsRes.error?.message ||
          projectsRes.error?.message ||
          commesseRes.error?.message ||
          "Errore caricamento impostazioni",
      );
      setLoading(false);
      return;
    }

    const user = authData?.user;
    if (!user?.id) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // Load studio for this user
    const currentMemberForStudio = (membersRes.data ?? []).find((m) => m.user_account === user.id);
    if (currentMemberForStudio?.studio) {
      const { data: studioData } = await supabase
        .from("studios")
        .select("*")
        .eq("id", currentMemberForStudio.studio)
        .single();
      setStudio(studioData ?? null);
      setStudioName(studioData?.name ?? "");
    }

    const allMembers = membersRes.data ?? [];
    let currentMember = allMembers.find((m) => m.user_account === user.id);
    if (!currentMember) {
      try {
        currentMember = await getOrCreateTeamMember(user);
        allMembers.push(currentMember);
      } catch (memberError) {
        setError(memberError.message);
        setLoading(false);
        return;
      }
    }

    setCurrentUserId(user.id);
    setCurrentEmail(user.email || "");
    setMembers(allMembers);
    setServices(servicesRes.data ?? []);
    setContacts(contactsRes.data ?? []);
    setArchivedProjects(projectsRes.data ?? []);
    setArchivedCommesse(commesseRes.data ?? []);
    setIsAdmin(currentMember?.role_internal === "Owner");
    setDisplayName(currentMember?.user_name || user.user_metadata?.display_name || "");
    setProfileEmail(currentMember?.user_email || user.email || "");
    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadAll();
  }, [studioId]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.classList.toggle("light-mode", theme === "light");
  }, [theme]);

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((tab) => !tab.adminOnly || permissions.canManageUsers),
    [permissions.canManageUsers],
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab("profilo");
    }
  }, [selectedTab, visibleTabs]);

  const saveProfile = async () => {
    setProfileMessage("");
    if (!displayName.trim()) {
      setProfileMessage("Inserisci un nome visualizzato valido.");
      return;
    }
    if (!profileEmail.trim()) {
      setProfileMessage("Inserisci una email valida.");
      return;
    }

    setSaving(true);
    const [{ error: authError }, { error: memberError }] = await Promise.all([
      supabase.auth.updateUser({ email: profileEmail.trim(), data: { display_name: displayName.trim() } }),
      currentUserId
        ? supabase
            .from("team_members")
            .update({ user_name: displayName.trim(), user_email: profileEmail.trim() })
            .eq("user_account", currentUserId)
        : Promise.resolve({ error: null }),
    ]);

    if (authError || memberError) {
      setProfileMessage(authError?.message || memberError?.message || "Errore salvataggio profilo.");
      setSaving(false);
      return;
    }

    setProfileMessage("Profilo aggiornato.");
    await loadAll();
    setSaving(false);
  };

  const changePassword = async () => {
    setProfileMessage("");
    if (!newPassword || newPassword.length < 6) {
      setProfileMessage("La password deve contenere almeno 6 caratteri.");
      return;
    }

    setSaving(true);
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) {
      setProfileMessage(passwordError.message);
      setSaving(false);
      return;
    }
    setNewPassword("");
    setProfileMessage("Password aggiornata.");
    setSaving(false);
  };

  const updateMemberRole = async (memberId, newRole) => {
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role_internal: newRole })
      .eq("id", memberId);
    if (!updateError) {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role_internal: newRole } : m)));
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("team_members")
      .insert({
        user_name: memberForm.user_name.trim(),
        user_email: memberForm.user_email.trim(),
        role_internal: memberForm.role_internal,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setMembers((prev) => [...prev, data].sort((a, b) => a.user_name.localeCompare(b.user_name, "it")));
    setMemberModalOpen(false);
    setMemberForm({ user_name: "", user_email: "", role_internal: ROLE_OPTIONS[0] });
    setSaving(false);
  };

  const removeMember = async (id) => {
    if (!window.confirm("Eliminare questo membro?")) {
      return;
    }
    const { error: deleteError } = await supabase.from("team_members").delete().eq("id", id);
    if (!deleteError) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const addService = async (event) => {
    event.preventDefault();
    const nextOrder = services.length > 0 ? Math.max(...services.map((s) => s.order || 0)) + 1 : 1;
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("service_task_templates")
      .insert({ service_name: serviceForm.service_name.trim(), order: nextOrder })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setServices((prev) => [...prev, data].sort((a, b) => (a.order || 0) - (b.order || 0)));
    setServiceModalOpen(false);
    setServiceForm({ service_name: "" });
    setSaving(false);
  };

  const renameService = async (serviceId) => {
    if (!editingServiceName.trim()) {
      return;
    }
    const { data, error: updateError } = await supabase
      .from("service_task_templates")
      .update({ service_name: editingServiceName.trim() })
      .eq("id", serviceId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, service_name: data.service_name } : s)));
    setEditingServiceId(null);
    setEditingServiceName("");
  };

  const removeService = async (id) => {
    if (!window.confirm("Eliminare questo servizio?")) {
      return;
    }
    const { error: deleteError } = await supabase.from("service_task_templates").delete().eq("id", id);
    if (!deleteError) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const openAddClient = () => {
    setEditingClient(null);
    setClientForm({ full_name: "", company: "", email: "", phone: "" });
    setClientModalOpen(true);
  };

  const openEditClient = (contact) => {
    setEditingClient(contact);
    setClientForm({
      full_name: contact.full_name || "",
      company: contact.company || "",
      email: contact.email || "",
      phone: contact.phone || "",
    });
    setClientModalOpen(true);
  };

  const saveClient = async (event) => {
    event.preventDefault();
    if (!clientForm.full_name.trim() || !clientForm.company.trim()) {
      setError("Nome completo e azienda sono obbligatori.");
      return;
    }

    setSaving(true);
    if (editingClient) {
      const { data, error: updateError } = await supabase
        .from("global_contacts")
        .update({
          full_name: clientForm.full_name.trim(),
          company: clientForm.company.trim(),
          email: clientForm.email.trim() || null,
          phone: clientForm.phone.trim() || null,
        })
        .eq("id", editingClient.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
      setContacts((prev) => prev.map((c) => (c.id === editingClient.id ? data : c)));
    } else {
      const { data, error: insertError } = await supabase
        .from("global_contacts")
        .insert({
          full_name: clientForm.full_name.trim(),
          company: clientForm.company.trim(),
          email: clientForm.email.trim() || null,
          phone: clientForm.phone.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
      setContacts((prev) => [data, ...prev]);
    }

    setClientModalOpen(false);
    setSaving(false);
  };

  const removeClient = async (id) => {
    if (!window.confirm("Eliminare questo cliente?")) {
      return;
    }
    const { error: deleteError } = await supabase.from("global_contacts").delete().eq("id", id);
    if (!deleteError) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const restoreProject = async (id) => {
    const { error: updateError } = await supabase.from("projects").update({ archived: false }).eq("id", id);
    if (!updateError) {
      setArchivedProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const restoreCommessa = async (id) => {
    const { error: updateError } = await supabase.from("commesse").update({ archived: false }).eq("id", id);
    if (!updateError) {
      setArchivedCommesse((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const saveStudioName = async () => {
    if (!studio?.id || !studioName.trim()) return;
    setStudioSaving(true);
    setStudioMessage("");
    const { data, error: updateErr } = await supabase
      .from("studios")
      .update({ name: studioName.trim() })
      .eq("id", studio.id)
      .select("*")
      .single();
    if (updateErr) {
      setStudioMessage(updateErr.message);
    } else {
      setStudio(data);
      setStudioMessage("Nome studio aggiornato.");
    }
    setStudioSaving(false);
  };

  const copyInviteCode = () => {
    if (!studio?.invite_code) return;
    navigator.clipboard.writeText(studio.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const regenerateInviteCode = async () => {
    if (!studio?.id) return;
    if (!window.confirm("Rigenerare il codice invito? Il vecchio codice non funzionerà più.")) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const { data, error: updateErr } = await supabase
      .from("studios")
      .update({ invite_code: code })
      .eq("id", studio.id)
      .select("*")
      .single();
    if (!updateErr) setStudio(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    if (selectedTab === "profilo") {
      return (
        <section className="space-y-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="text-lg font-semibold">Profilo</h3>
          <div>
            <p className="text-sm text-white/60">Email utente</p>
            <input
              value={profileEmail}
              onChange={(event) => setProfileEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/80">Nome visualizzato</label>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Nuova password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60"
            >
              Salva profilo
            </button>
            <button
              type="button"
              onClick={changePassword}
              disabled={saving}
              className="rounded-lg border border-[#48484a] px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              Cambia password
            </button>
          </div>
          {profileMessage ? <p className="text-sm text-white/80">{profileMessage}</p> : null}
        </section>
      );
    }

    if (selectedTab === "studio") {
      return (
        <section className="space-y-5 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="text-lg font-semibold text-white">Il mio Studio</h3>
          {!studio ? (
            <p className="text-sm text-white/50">Nessuno studio associato al tuo account.</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome studio</label>
                <div className="flex gap-2">
                  <input
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="flex-1 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  />
                  <button
                    type="button"
                    onClick={saveStudioName}
                    disabled={studioSaving || !studioName.trim()}
                    className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {studioSaving ? "Salvo..." : "Salva"}
                  </button>
                </div>
                {studioMessage ? <p className="mt-1 text-xs text-[#30d158]">{studioMessage}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Codice invito</label>
                <div className="flex items-center gap-3 rounded-xl border border-[#48484a] bg-[#1c1c1e] p-4">
                  <span className="flex-1 font-mono text-3xl font-bold tracking-widest text-[#0a84ff]">
                    {studio.invite_code ?? "——"}
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={copyInviteCode}
                      className="rounded-lg border border-[#48484a] px-3 py-1.5 text-xs text-white hover:bg-white/10"
                    >
                      {codeCopied ? "✓ Copiato" : "Copia"}
                    </button>
                    <button
                      type="button"
                      onClick={regenerateInviteCode}
                      className="rounded-lg border border-[#48484a] px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
                    >
                      Rigenera
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/40">Condividi questo codice con i colleghi per invitarli nel tuo studio.</p>
              </div>
            </>
          )}
        </section>
      );
    }

    if (selectedTab === "aspetto") {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="text-lg font-semibold">Aspetto</h3>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-lg px-4 py-2 text-sm ${theme === "dark" ? "bg-[#0a84ff]" : "border border-[#48484a]"}`}
            >
              Dark Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-lg px-4 py-2 text-sm ${theme === "light" ? "bg-[#0a84ff]" : "border border-[#48484a]"}`}
            >
              Light Mode
            </button>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Preferenza salvata in locale e applicata globalmente all&apos;app.
          </p>
        </section>
      );
    }

    if (selectedTab === "utenti" && isAdmin) {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestione Utenti</h3>
            <button
              type="button"
              onClick={() => setMemberModalOpen(true)}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110"
            >
              Aggiungi Membro
            </button>
          </div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{member.user_name}</p>
                  <p className="text-xs text-white/70">{member.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.user_account !== currentUserId ? (
                    <select
                      value={member.role_internal || "Member"}
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      className="rounded-md border border-[#48484a] bg-[#3a3a3c] px-2 py-1 text-xs text-white outline-none"
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="rounded-md border border-[#48484a] bg-[#1c1c1e] px-2 py-1 text-xs text-white/40">{member.role_internal || "Member"}</span>
                  )}
                  {member.user_account !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="rounded-md border border-[#48484a] px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Elimina
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (selectedTab === "servizi") {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestione Servizi</h3>
            <button
              type="button"
              onClick={() => setServiceModalOpen(true)}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110"
            >
              Aggiungi Servizio
            </button>
          </div>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex items-center gap-2 rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                <div className="flex-1">
                  {editingServiceId === service.id ? (
                    <input
                      value={editingServiceName}
                      onChange={(event) => setEditingServiceName(event.target.value)}
                      className="w-full rounded-md border border-[#48484a] bg-[#3a3a3c] px-2 py-1 text-sm outline-none ring-[#0a84ff]/60 focus:ring"
                    />
                  ) : (
                    <p className="text-sm">{service.service_name}</p>
                  )}
                </div>
                {editingServiceId === service.id ? (
                  <button
                    type="button"
                    onClick={() => renameService(service.id)}
                    className="rounded-md bg-[#0a84ff] px-3 py-1 text-xs"
                  >
                    Salva
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingServiceId(service.id);
                      setEditingServiceName(service.service_name || "");
                    }}
                    className="rounded-md border border-[#48484a] px-3 py-1 text-xs hover:bg-white/10"
                  >
                    Rinomina
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="rounded-md border border-[#48484a] px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (selectedTab === "clienti") {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Clienti</h3>
            <button
              type="button"
              onClick={openAddClient}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110"
            >
              Aggiungi Cliente
            </button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{contact.full_name}</p>
                  <p className="truncate text-xs text-white/70">{contact.company}</p>
                  <p className="truncate text-xs text-white/60">
                    {contact.email || "-"} | {contact.phone || "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditClient(contact)}
                    className="rounded-md border border-[#48484a] px-3 py-1 text-xs hover:bg-white/10"
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => removeClient(contact.id)}
                    className="rounded-md border border-[#48484a] px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (selectedTab === "progetti-archiviati") {
      return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {archivedProjects.map((project) => (
            <article key={project.id} className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{project.name || "Progetto"}</h3>
                <span className="rounded-md bg-[#ff9f0a]/20 px-2 py-1 text-xs text-[#ff9f0a]">Archiviato</span>
              </div>
              <p className="text-sm text-white/70">Cliente: {project.client || "-"}</p>
              <p className="text-sm text-white/60">Indirizzo: {project.address || "-"}</p>
              <button
                type="button"
                onClick={() => restoreProject(project.id)}
                className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110"
              >
                Ripristina
              </button>
            </article>
          ))}
          {archivedProjects.length === 0 ? (
            <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
              Nessun progetto archiviato.
            </section>
          ) : null}
        </section>
      );
    }

    if (selectedTab === "commesse-archiviate") {
      return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {archivedCommesse.map((commessa) => (
            <article key={commessa.id} className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{commessa.nome_commessa || "Commessa"}</h3>
                <span className="rounded-md bg-[#ff9f0a]/20 px-2 py-1 text-xs text-[#ff9f0a]">Archiviata</span>
              </div>
              <p className="text-sm text-white/70">Offerta: {commessa.numero_offerta || "-"}</p>
              <p className="text-sm text-white/60">Cliente: {commessa.cliente || "-"}</p>
              <button
                type="button"
                onClick={() => restoreCommessa(commessa.id)}
                className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium hover:brightness-110"
              >
                Ripristina
              </button>
            </article>
          ))}
          {archivedCommesse.length === 0 ? (
            <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
              Nessuna commessa archiviata.
            </section>
          ) : null}
        </section>
      );
    }

    if (selectedTab === "esci") {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="text-lg font-semibold">Esci</h3>
          <p className="mt-2 text-sm text-white/70">Termina la sessione corrente e torna al login.</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded-lg border border-[#48484a] px-4 py-2 text-sm hover:bg-white/10"
          >
            Logout
          </button>
        </section>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento impostazioni...
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-sm text-red-300">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-3">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selectedTab === tab.id
                    ? "bg-[#0a84ff] text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main>{renderContent()}</main>
      </section>

      {memberModalOpen ? (
        <Modal title="Aggiungi Membro" onClose={() => setMemberModalOpen(false)}>
          <form className="space-y-4" onSubmit={addMember}>
            <input
              placeholder="Nome"
              value={memberForm.user_name}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, user_name: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={memberForm.user_email}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, user_email: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              required
            />
            <select
              value={memberForm.role_internal}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, role_internal: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Salva
            </button>
          </form>
        </Modal>
      ) : null}

      {serviceModalOpen ? (
        <Modal title="Aggiungi Servizio" onClose={() => setServiceModalOpen(false)}>
          <form className="space-y-4" onSubmit={addService}>
            <input
              placeholder="Nome servizio"
              value={serviceForm.service_name}
              onChange={(event) => setServiceForm({ service_name: event.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Salva
            </button>
          </form>
        </Modal>
      ) : null}

      {clientModalOpen ? (
        <Modal title={editingClient ? "Modifica Cliente" : "Aggiungi Cliente"} onClose={() => setClientModalOpen(false)}>
          <form className="space-y-4" onSubmit={saveClient}>
            <input
              placeholder="Nome completo *"
              value={clientForm.full_name}
              onChange={(event) => setClientForm((prev) => ({ ...prev, full_name: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              required
            />
            <input
              placeholder="Azienda *"
              value={clientForm.company}
              onChange={(event) => setClientForm((prev) => ({ ...prev, company: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              required
            />
            <input
              placeholder="Email"
              value={clientForm.email}
              onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
            <input
              placeholder="Telefono"
              value={clientForm.phone}
              onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Salva
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

// Currency formatter
function currency(val) {
  const n = Number(val);
  return isNaN(n) ? "—" : n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Refresh icon
function RefreshIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export default function CommesseArchiviatePage() {
  usePageTitleOnMount("Commesse Archiviate");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (!studioId) return;
    loadData();
  }, [studioId]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("commesse")
      .select("*")
      .eq("studio", studioId)
      .eq("archived", true)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCommesse(data || []);
    }

    setLoading(false);
  };

  const handleUnarchive = async (commessaId) => {
    setRestoring(commessaId);

    const { error: updateError } = await supabase
      .from("commesse")
      .update({ archived: false })
      .eq("id", commessaId);

    if (updateError) {
      alert("Errore: " + updateError.message);
    } else {
      setCommesse((prev) => prev.filter((c) => c.id !== commessaId));
    }

    setRestoring(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Commesse Archiviate</h2>
        <p className="text-sm text-white/60">Commesse archiviate non più attive</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {commesse.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          <p>Nessuna commessa archiviata.</p>
          <button
            onClick={() => navigate("/commesse")}
            className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Vai alle Commesse
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {commesse.map((commessa) => (
            <div
              key={commessa.id}
              className="flex items-center justify-between rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-white">
                    {commessa.nome_commessa || "Commessa senza nome"}
                  </h3>
                  <span className="rounded bg-[#48484a] px-2 py-0.5 text-xs text-white/70">
                    {commessa.numero_offerta || "N/D"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                  <span>{commessa.cliente || "N/D"}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{currency(commessa.importo_offerta_base)}</span>
                  {commessa.data_commessa && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(commessa.data_commessa).toLocaleDateString("it-IT")}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => navigate(`/commesse/${commessa.id}`)}
                  className="hidden rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-1.5 text-xs text-white hover:bg-[#48484a] sm:block"
                >
                  Visualizza
                </button>
                <button
                  onClick={() => handleUnarchive(commessa.id)}
                  disabled={restoring === commessa.id}
                  className="flex items-center gap-1.5 rounded-lg border border-[#0a84ff] bg-[#0a84ff]/20 px-3 py-1.5 text-xs text-[#0a84ff] hover:bg-[#0a84ff]/30 disabled:opacity-60"
                >
                  <RefreshIcon className="h-3.5 w-3.5" />
                  {restoring === commessa.id ? "..." : "Ripristina"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

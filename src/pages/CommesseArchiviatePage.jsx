import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

// Currency formatter
function currency(val) {
  const n = Number(val);
  return isNaN(n)
    ? "—"
    : n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function CommesseArchiviatePage() {
  usePageTitleOnMount("Commesse Archiviate");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const { error: updateError } = await supabase
      .from("commesse")
      .update({ archived: false })
      .eq("id", commessaId);

    if (updateError) {
      alert("Errore: " + updateError.message);
    } else {
      setCommesse((prev) => prev.filter((c) => c.id !== commessaId));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Commesse Archiviate</h2>
          <p className="text-sm text-white/60">
            Commesse archiviate non più attive
          </p>
        </div>
        <button
          onClick={() => navigate("/commesse")}
          className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Torna alle Commesse
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {commesse.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessuna commessa archiviata.
        </div>
      ) : (
        <div className="space-y-3">
          {commesse.map((commessa) => (
            <div
              key={commessa.id}
              className="flex items-center justify-between rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 opacity-75 transition hover:opacity-100"
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
                <div className="mt-1 flex items-center gap-4 text-sm text-white/60">
                  <span>{commessa.cliente || "N/D"}</span>
                  <span>•</span>
                  <span>{currency(commessa.importo_offerta_base)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/commesse/${commessa.id}`)}
                  className="rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-1.5 text-xs text-white hover:bg-[#48484a]"
                >
                  Visualizza
                </button>
                <button
                  onClick={() => handleUnarchive(commessa.id)}
                  className="rounded-lg border border-[#0a84ff] bg-[#0a84ff]/20 px-3 py-1.5 text-xs text-[#0a84ff] hover:bg-[#0a84ff]/30"
                >
                  Ripristina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

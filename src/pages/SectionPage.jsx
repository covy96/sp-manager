export default function SectionPage({ title }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#2c2c2e] p-10 text-center">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/60">
        Pagina in costruzione. Qui troverai i contenuti di {title}.
      </p>
    </section>
  );
}

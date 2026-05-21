import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitleOnMount } from '../../hooks/usePageTitle';

const SunIcon = () => <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
const MoonIcon = () => <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>;
const MonitorIcon = () => <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;

const THEMES = [
  { id:'light',  label:'Chiaro',  Icon:SunIcon,     desc:'Sempre tema chiaro' },
  { id:'dark',   label:'Scuro',   Icon:MoonIcon,    desc:'Sempre tema scuro' },
  { id:'system', label:'Sistema', Icon:MonitorIcon, desc:'Segue le impostazioni del dispositivo' },
];

const SWATCHES = [
  { label:'Sfondo',  var:'--asm-bg'      },
  { label:'Card',    var:'--asm-surface' },
  { label:'Testo',   var:'--asm-ink'     },
  { label:'Navy',    var:'--asm-navy'    },
  { label:'Brass',   var:'--asm-brass'   },
];

export default function AspettoPage() {
  usePageTitleOnMount('Aspetto');
  const { T, theme, setTheme } = useTheme();

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Aspetto</div>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>Personalizza l'aspetto dell'applicazione</div>
      </div>

      {/* Selezione tema */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 22px', marginBottom:14 }}>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:16 }}>Tema</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {THEMES.map(({ id, label, Icon, desc }) => {
            const active = theme === id;
            return (
              <button key={id} onClick={() => setTheme(id)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                padding:'24px 12px',
                border:`0.5px solid ${active ? T.navy : T.borderMd}`,
                background: active ? T.navyLight : T.surface2,
                cursor:'pointer', transition:'all 0.15s',
              }}>
                <span style={{ color: active ? T.navy : T.muted }}><Icon/></span>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color: active ? T.navy : T.ink, fontWeight: active ? 600 : 400 }}>{label}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:6, lineHeight:1.5 }}>{desc}</div>
                </div>
                <div style={{ width:6, height:6, borderRadius:'50%', background: active ? T.navy : T.border, transition:'background 0.15s' }}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* Anteprima colori */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 22px' }}>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:16 }}>Anteprima tema corrente</div>
        <div style={{ display:'flex', gap:10 }}>
          {SWATCHES.map(s => (
            <div key={s.var} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <div style={{ width:'100%', height:48, background:`var(${s.var})`, border:`0.5px solid ${T.border}` }}/>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, textAlign:'center', letterSpacing:'0.1em', textTransform:'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

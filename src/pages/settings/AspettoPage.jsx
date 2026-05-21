import { usePageTitleOnMount } from '../../hooks/usePageTitle';
import { useTheme } from '../../contexts/ThemeContext';

const THEMES = [
  { id:'light',  emoji:'☀️', label:'Chiaro',  desc:'Sempre tema chiaro' },
  { id:'dark',   emoji:'🌙', label:'Scuro',   desc:'Sempre tema scuro'  },
  { id:'system', emoji:'💻', label:'Sistema', desc:'Segue le impostazioni del dispositivo' },
];

export default function AspettoPage() {
  usePageTitleOnMount('Aspetto');
  const { T, theme, setTheme } = useTheme();

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Aspetto</div>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>Scegli il tema dell'applicazione</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {THEMES.map(t => {
          const active = theme === t.id;
          return (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{
              display:'flex', alignItems:'center', gap:14,
              padding:'16px 18px',
              background: active ? T.navyLight : T.surface,
              border:`0.5px solid ${active ? T.navy : T.border}`,
              cursor:'pointer', textAlign:'left', width:'100%',
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{t.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:2 }}>{t.label}</div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>{t.desc}</div>
              </div>
              <div style={{ width:18, height:18, borderRadius:'50%', border:`1.5px solid ${active ? T.navy : T.borderMd}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {active && <div style={{ width:10, height:10, borderRadius:'50%', background:T.navy }}/>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

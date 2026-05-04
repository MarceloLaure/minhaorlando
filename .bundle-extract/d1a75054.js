// Main App — Real auth flow + gated admin tab. No Tweaks panel in production.

const { useState, useEffect } = React;

const TABS_BASE = [
  { id: 'home', icon: 'home', labelPt: 'Início', labelEn: 'Home' },
  { id: 'plan', icon: 'calendar', labelPt: 'Plano', labelEn: 'Plan' },
  { id: 'map', icon: 'map', labelPt: 'Mapa', labelEn: 'Map' },
  { id: 'food', icon: 'food', labelPt: 'Comida', labelEn: 'Dining' },
  { id: 'family', icon: 'family', labelPt: 'Família', labelEn: 'Family' },
];

function TabBar({ active, setActive, theme, lang, isAdmin }) {
  const tabs = isAdmin
    ? [...TABS_BASE, { id: 'admin', icon: 'sparkle', labelPt: 'Admin', labelEn: 'Admin' }]
    : TABS_BASE;
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 12, right: 12,
      background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: 26, padding: '6px 8px',
      border: `1px solid ${theme.border}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
      display: 'flex', justifyContent: 'space-between', zIndex: 10,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <div key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            borderRadius: 18, cursor: 'pointer', position: 'relative',
            background: isActive ? theme.grad : 'transparent',
            color: isActive ? 'white' : theme.textMuted,
            transition: 'all .2s',
            boxShadow: isActive ? `0 4px 12px ${theme.primary}55` : 'none',
          }}>
            <Icon name={t.icon} size={20} color={isActive ? 'white' : theme.textMuted} stroke={isActive ? 2.2 : 1.8}/>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.2 }}>{lang==='en'?t.labelEn:t.labelPt}</div>
          </div>
        );
      })}
    </div>
  );
}

function PixieFAB({ onClick, theme }) {
  return (
    <div onClick={onClick} style={{
      position: 'absolute', bottom: 86, right: 16, zIndex: 20,
      width: 56, height: 56, borderRadius: '50%',
      background: theme.grad,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: `0 8px 22px ${theme.primary}77, 0 2px 6px rgba(0,0,0,0.2)`,
      animation: 'pixiePulse 2.4s ease-in-out infinite',
    }}>
      <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', animation: 'pixieRing 2.4s ease-out infinite' }}/>
      <Icon name="sparkle" color="white" size={26}/>
    </div>
  );
}

function TopBar({ theme, lang, setLang, dark, setDark, onLogout }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 16px 6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: theme.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 10px ${theme.primary}55`,
        }}>
          <Icon name="sparkle" color="white" size={18}/>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: theme.text, fontFamily: window.FONT_DISPLAY, lineHeight: 1 }}>Orlando</div>
          <div style={{ fontSize: 9, color: theme.textMuted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Trip Planner</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div onClick={() => setLang(lang==='pt'?'en':'pt')} style={{
          padding: '6px 10px', borderRadius: 10,
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          fontSize: 11, fontWeight: 800, color: theme.text, cursor: 'pointer',
        }}>{lang==='pt'?'🇧🇷 PT':'🇺🇸 EN'}</div>
        <div onClick={() => setDark(!dark)} title={dark ? 'Light' : 'Dark'} style={{
          width: 34, height: 34, borderRadius: 10,
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16,
        }}>{dark ? '☀️' : '🌙'}</div>
        {onLogout && (
          <div onClick={onLogout} title="Logout" style={{
            width: 34, height: 34, borderRadius: 10,
            background: theme.bgCard, border: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Icon name="x" color={theme.text} size={14}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
function App() {
  // Visual prefs persistidas em localStorage (não é Tweak panel)
  const [lang, setLangState] = useState(() => localStorage.getItem('ot_lang') || 'pt');
  const [dark, setDarkState] = useState(() => localStorage.getItem('ot_dark') === '1');
  const [showConv, setShowConvState] = useState(() => localStorage.getItem('ot_showConv') === '1');
  const setLang = (v) => { setLangState(v); localStorage.setItem('ot_lang', v); };
  const setDark = (v) => { setDarkState(v); localStorage.setItem('ot_dark', v ? '1' : '0'); };
  const setShowConv = (v) => { setShowConvState(v); localStorage.setItem('ot_showConv', v ? '1' : '0'); };

  // Tema fixo: magic
  const theme = window.getTheme('magic', dark);
  const family = window.DEFAULT_FAMILY;

  // Auth state (real)
  const [authStep, setAuthStep] = useState('loading'); // 'loading' | 'login' | 'sent' | 'in'
  const [authUser, setAuthUser] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  // Trip state
  const [currentDay] = useState(3); // TODO: derive de hoje vs data de início
  const [tab, setTab] = useState('home');
  const [overlay, setOverlay] = useState(null);
  const [selectedPark, setSelectedPark] = useState('mk');

  const navigate = (dest, payload) => {
    if (dest === 'attraction') setOverlay({ type: 'attraction', id: payload });
    else if (dest === 'chat') setOverlay({ type: 'chat' });
    else if (dest === 'expenses') setOverlay({ type: 'expenses' });
    else if (dest === 'weather') setOverlay({ type: 'weather' });
    else if (dest === 'plan') setTab('plan');
  };
  const goBack = () => setOverlay(null);

  // Auth bootstrap
  useEffect(() => {
    let mounted = true;

    // Espera o config.js terminar de carregar (script externo dinâmico)
    function waitForConfig(maxMs = 1500) {
      return new Promise((resolve) => {
        const start = Date.now();
        function check() {
          if (typeof window.SUPABASE_URL !== 'undefined' || Date.now() - start > maxMs) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        }
        check();
      });
    }

    async function bootstrap() {
      await waitForConfig();
      // Modo demo (sem config.js editado): pula direto pro app
      if (window.SupabaseAPI.isDemo) {
        setAuthUser({ email: 'demo@orlando.app', name: 'Demo User', role: 'admin' });
        setAuthStep('in');
        return;
      }

      const session = await window.SupabaseAPI.getSession();
      if (!mounted) return;
      if (session) {
        const info = await window.SupabaseAPI.getCurrentUserInfo();
        if (!mounted) return;
        if (info) {
          setAuthUser(info);
          setAuthStep('in');
        } else {
          // Logado no Supabase mas não está na allowlist → força logout
          await window.SupabaseAPI.signOut();
          setAuthStep('login');
        }
      } else {
        setAuthStep('login');
      }
    }

    bootstrap();

    // Listener pra quando o magic link redirecionar
    const sub = window.SupabaseAPI.onAuthChange(async (session) => {
      if (!mounted) return;
      if (session) {
        const info = await window.SupabaseAPI.getCurrentUserInfo();
        if (info) {
          setAuthUser(info);
          setAuthStep('in');
        } else {
          await window.SupabaseAPI.signOut();
          setAuthStep('login');
        }
      } else {
        setAuthUser(null);
        setAuthStep('login');
      }
    });

    return () => { mounted = false; sub?.unsubscribe?.(); };
  }, []);

  const handleLogout = async () => {
    await window.SupabaseAPI.signOut();
    setAuthUser(null);
    setAuthStep('login');
  };

  // ── Render por estado de auth ──────────────────────────────
  if (authStep === 'loading') {
    return (
      <window.IOSDevice width={402} height={874} dark={dark}>
        <div style={{ position: 'absolute', inset: 0, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: theme.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pixiePulse 1.2s ease-in-out infinite' }}>
            <Icon name="sparkle" color="white" size={26}/>
          </div>
        </div>
      </window.IOSDevice>
    );
  }

  if (authStep === 'login') {
    return (
      <window.IOSDevice width={402} height={874} dark={dark}>
        <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: window.FONT, paddingTop: 60, overflow: 'auto' }}>
          <window.LoginScreen theme={theme} lang={lang} onSubmit={(u) => { setPendingEmail(u.email); setAuthStep('sent'); }}/>
        </div>
      </window.IOSDevice>
    );
  }

  if (authStep === 'sent') {
    return (
      <window.IOSDevice width={402} height={874} dark={dark}>
        <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: window.FONT, paddingTop: 60, overflow: 'auto' }}>
          <window.MagicLinkSent
            theme={theme} lang={lang}
            user={{ email: pendingEmail }}
            onBack={() => setAuthStep('login')}
            onContinueDemo={() => {
              // Só pra modo demo (config.js placeholder)
              setAuthUser({ email: pendingEmail, name: 'Demo', role: 'admin' });
              setAuthStep('in');
            }}
          />
        </div>
      </window.IOSDevice>
    );
  }

  // ── Logged in: render app ──────────────────────────────────
  const isAdmin = authUser?.role === 'admin';

  // Guard: se aba admin mas não-admin, redireciona
  if (tab === 'admin' && !isAdmin) {
    setTab('home');
  }

  let screenContent;
  if (overlay?.type === 'attraction') {
    screenContent = <AttractionDetail theme={theme} lang={lang} family={family} attractionId={overlay.id} goBack={goBack}/>;
  } else if (overlay?.type === 'chat') {
    screenContent = <ChatScreen theme={theme} lang={lang} family={family} currentDay={currentDay} personality="fun"/>;
  } else if (overlay?.type === 'expenses') {
    screenContent = <ExpensesScreen theme={theme} lang={lang} family={family} fxRate={window.FX_RATE} showConv={showConv} setShowConv={setShowConv}/>;
  } else if (overlay?.type === 'weather') {
    screenContent = <WeatherScreen theme={theme} lang={lang}/>;
  } else if (tab === 'home') {
    screenContent = <HomeScreen theme={theme} lang={lang} family={family} currentDay={currentDay} navigate={navigate} showConv={showConv} fxRate={window.FX_RATE}/>;
  } else if (tab === 'plan') {
    screenContent = <PlanScreen theme={theme} lang={lang} currentDay={currentDay} setCurrentDay={()=>{}} navigate={navigate}/>;
  } else if (tab === 'map') {
    screenContent = <MapScreen theme={theme} lang={lang} family={family} navigate={navigate} selectedPark={selectedPark} setSelectedPark={setSelectedPark}/>;
  } else if (tab === 'food') {
    screenContent = <RestaurantsScreen theme={theme} lang={lang} navigate={navigate}/>;
  } else if (tab === 'family') {
    screenContent = <FamilyScreen theme={theme} lang={lang} family={family} navigate={navigate}/>;
  } else if (tab === 'admin' && isAdmin) {
    screenContent = <window.AdminScreen theme={theme} lang={lang} currentUser={authUser}/>;
  }

  return (
    <window.IOSDevice width={402} height={874} dark={dark}>
      <div style={{
        position: 'absolute', inset: 0, background: theme.bg,
        fontFamily: window.FONT, color: theme.text, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8, paddingTop: 60 }}>
          {!overlay && <TopBar theme={theme} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogout={handleLogout}/>}
          {screenContent}
        </div>

        {overlay?.type !== 'chat' && (
          <PixieFAB theme={theme} onClick={() => setOverlay({ type: 'chat' })}/>
        )}

        {!overlay && <TabBar active={tab} setActive={setTab} theme={theme} lang={lang} isAdmin={isAdmin}/>}
        {overlay && (
          <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <div onClick={goBack} style={{
              padding: '12px 20px', borderRadius: 999,
              background: theme.bgCard, border: `1px solid ${theme.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}>
              <Icon name="arrow-left" color={theme.text} size={16}/>
              <span style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{window.tr('Voltar', lang)}</span>
            </div>
          </div>
        )}
      </div>
    </window.IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

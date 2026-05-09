// Hi-fi refined screens for PropAgent SG, dressed in the 10ThirtyLabs brand language.
// Direction: dark-first onyx canvas, full-spectrum-blue brand accents, aqua CTA, pill geometry,
// sentence-case headings, no emoji, Inter body + Figtree (BT Beau Sans fallback) display.
// Conventional CRM patterns with two distinctive moments:
//   1. The Brief — a daily focus card that tells the agent "who to call next, why, what to say"
//   2. Area Insight as a hero data surface, not a buried card

const T = {
  font: '"Inter", -apple-system, sans-serif',
  display: '"Figtree", "BT Beau Sans", Inter, sans-serif',
  onyx: '#121212',
  onyx2: '#1A1A1A',
  onyx3: '#222222',
  onyxLine: '#2A2A2A',
  blue: '#2859F7',
  blueDeep: '#0945E6',
  aqua: '#8EFEFF',
  white: '#FFFFFF',
  gray1: '#454545',
  gray2: '#898E92',
  gray3: '#EBEBEB',
  offWhite: '#EEF8FF',
  red: '#FF5A5A',
  amber: '#F7B85C',
  green: '#3FCB8E',
};

// ── Logo mark (clock icon, white) ─────────────────────────────
function LogoMark({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6"/>
        <path d="M12 7 L12 12 L15 13.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// ── Pill button ───────────────────────────────────────────────
function Btn({ children, primary, ghost, dark, sm, style, ...rest }) {
  const bg = primary ? T.aqua : ghost ? 'transparent' : dark ? T.onyx2 : T.blue;
  const fg = primary ? T.onyx : ghost ? T.white : T.white;
  const border = ghost ? `1px solid ${T.onyxLine}` : 'none';
  return (
    <button {...rest} style={{
      borderRadius: 999, border, background: bg, color: fg,
      fontFamily: T.font, fontSize: sm ? 12 : 13, fontWeight: 500,
      padding: sm ? '6px 14px' : '10px 18px', cursor: 'pointer',
      letterSpacing: 0.1, ...style,
    }}>{children}</button>
  );
}

// ── Tag/Chip ──────────────────────────────────────────────────
function Chip({ children, tone = 'default', filled }) {
  const tones = {
    default: { fg: T.gray2, br: T.onyxLine, bg: 'transparent' },
    blue: { fg: T.aqua, br: 'rgba(40,89,247,0.5)', bg: 'rgba(40,89,247,0.12)' },
    green: { fg: T.green, br: 'rgba(63,203,142,0.4)', bg: 'rgba(63,203,142,0.10)' },
    amber: { fg: T.amber, br: 'rgba(247,184,92,0.4)', bg: 'rgba(247,184,92,0.10)' },
    red: { fg: T.red, br: 'rgba(255,90,90,0.4)', bg: 'rgba(255,90,90,0.10)' },
    light: { fg: T.onyx, br: 'transparent', bg: T.offWhite },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      border: `1px solid ${t.br}`, background: filled ? t.bg : 'transparent',
      color: t.fg, fontFamily: T.display, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.4, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

// ── Sidebar nav (10TL dark)
const NAV = [
  { l: 'Dashboard', k: 'dashboard' },
  { l: 'Leads', k: 'leads', n: 7 },
  { l: 'Pipeline', k: 'pipeline' },
  { l: 'Listings', k: 'listings' },
  { l: 'Viewings', k: 'viewings' },
  { l: 'Messages', k: 'messages', n: 3 },
  { l: 'Deals', k: 'deals' },
  { l: 'Insights', k: 'insights' },
  { l: 'Settings', k: 'settings' },
];

function Sidebar({ active = 'dashboard' }) {
  return (
    <div style={{
      width: 232, background: T.onyx, color: T.white,
      borderRight: `1px solid ${T.onyxLine}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '22px 22px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <LogoMark size={32} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>PropAgent</div>
          <div style={{ fontFamily: T.font, fontSize: 11, color: T.gray2, marginTop: 2 }}>SG · Singapore</div>
        </div>
      </div>
      <div style={{ padding: '0 12px', flex: 1 }}>
        {NAV.map(n => {
          const on = n.k === active;
          return (
            <div key={n.k} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 999, marginBottom: 2,
              background: on ? 'rgba(40,89,247,0.18)' : 'transparent',
              border: on ? `1px solid rgba(40,89,247,0.5)` : '1px solid transparent',
              color: on ? T.white : T.gray2, cursor: 'pointer',
              fontFamily: T.font, fontWeight: 500, fontSize: 13,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: on ? T.aqua : T.gray2 }} />
                {n.l}
              </span>
              {n.n && (
                <span style={{
                  background: on ? T.aqua : T.onyx3, color: on ? T.onyx : T.gray2,
                  borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                }}>{n.n}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${T.onyxLine}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg, #6571F5, #0C5AFF)' }} />
          <div style={{ lineHeight: 1.2, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Hoang Vu Mai</div>
            <div style={{ fontSize: 10, color: T.gray2 }}>CEA R0123456J</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageBar({ title, sub, right }) {
  return (
    <div style={{
      padding: '20px 32px', borderBottom: `1px solid ${T.onyxLine}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    }}>
      <div>
        <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 26, color: T.white, letterSpacing: -0.4 }}>{title}</div>
        {sub && <div style={{ fontFamily: T.font, fontSize: 13, color: T.gray2, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{right}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 1: Dashboard with The Brief (distinctive moment)
// ────────────────────────────────────────────────────────────────────
function HFDashboard() {
  return (
    <div style={{ width: 1280, height: 800, background: T.onyx, color: T.white, display: 'flex', fontFamily: T.font, overflow: 'hidden' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageBar
          title="Today, Friday 8 May"
          sub="Good morning, Hoang. 3 leads need follow-up before noon."
          right={<>
            <Btn ghost sm>Stamp duty</Btn>
            <Btn primary>+ New lead</Btn>
          </>}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
          {/* The Brief — distinctive moment */}
          <div style={{
            position: 'relative', borderRadius: 24, padding: 28,
            background: `radial-gradient(120% 120% at 100% 0%, rgba(142,254,255,0.18), transparent 60%), linear-gradient(135deg, #0945E6 0%, #2859F7 50%, #0C5AFF 100%)`,
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(142,254,255,0.5), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: T.aqua, boxShadow: `0 0 12px ${T.aqua}` }} />
              <div style={{ fontFamily: T.display, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: T.aqua }}>THE BRIEF · 10:30</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 32, marginTop: 18, position: 'relative' }}>
              <div>
                <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>
                  Tan Wei Ling is your highest-leverage call today.
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
                  PR · budget firm at $2.8M · viewing tomorrow at Mt Faber. She replied 4h ago. The unit's last comp closed at $2,180 psf — your asking sits 3% under.
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <Btn primary>Open thread</Btn>
                  <Btn ghost style={{ borderColor: 'rgba(255,255,255,0.3)' }}>Skip · next lead</Btn>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'rgba(255,255,255,0.6)' }}>WHAT TO SAY</div>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 1.7 }}>
                  <li>· Lead with the comp at $2,180 psf</li>
                  <li>· Mention 4-min MRT walk (her brief)</li>
                  <li>· Confirm Saturday 4pm viewing</li>
                </ul>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'rgba(255,255,255,0.6)' }}>RISK / WATCHOUT</div>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 1.7 }}>
                  <li>· Asked about tenure — 99yr, 67yrs left</li>
                  <li>· Spouse is the decision maker · loop in</li>
                </ul>
              </div>
            </div>
          </div>

          {/* KPI strip — sparkline-led, not flat numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
            {[
              { l: 'Active leads', v: '24', d: '+3 wk', spark: [4,5,4,6,7,6,8], pos: true },
              { l: 'Viewings booked', v: '5', d: 'this week', spark: [2,3,2,4,3,5,5], pos: true },
              { l: 'Closing pipeline', v: 'S$48k', d: 'commission est.', spark: [30,32,38,40,42,46,48], pos: true },
              { l: 'Overdue tasks', v: '3', d: 'Action needed', spark: [1,2,2,1,2,3,3], warn: true },
            ].map((k, i) => (
              <div key={i} style={{
                background: T.onyx2, border: `1px solid ${T.onyxLine}`,
                borderRadius: 16, padding: 18,
              }}>
                <div style={{ fontSize: 12, color: T.gray2, fontFamily: T.display, fontWeight: 600, letterSpacing: 0.3 }}>{k.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{
                    fontFamily: T.display, fontWeight: 700, fontSize: 32, letterSpacing: -0.5,
                    color: k.warn ? T.red : T.white,
                  }}>{k.v}</div>
                  <Sparkline data={k.spark} warn={k.warn} />
                </div>
                <div style={{ fontSize: 11, color: T.gray2, marginTop: 4 }}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* Two-up: Pipeline funnel + Today's schedule */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginTop: 18 }}>
            <div style={{ background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>Pipeline · this week</div>
                <Btn ghost sm>Open board</Btn>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 18, alignItems: 'flex-end', height: 140 }}>
                {[
                  { s: 'New', n: 7, h: 100 },
                  { s: 'Contacted', n: 12, h: 88 },
                  { s: 'Qualified', n: 8, h: 70 },
                  { s: 'Viewing', n: 5, h: 52 },
                  { s: 'Negotiating', n: 3, h: 38 },
                  { s: 'OTP', n: 2, h: 24 },
                  { s: 'Closed', n: 1, h: 14 },
                ].map((b, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: T.gray2, marginBottom: 6 }}>{b.n}</div>
                    <div style={{
                      height: `${b.h}%`,
                      background: i === 3 ? T.aqua : `linear-gradient(180deg, ${T.blue}, ${T.blueDeep})`,
                      borderRadius: 4, opacity: 0.9,
                    }} />
                    <div style={{ fontSize: 10, color: T.gray2, marginTop: 8, fontFamily: T.display, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{b.s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>Schedule</div>
                <span style={{ fontSize: 11, color: T.gray2 }}>3 events</span>
              </div>
              {[
                { t: '10:30', l: 'Call · Tan Wei Ling', tag: 'lead' },
                { t: '14:00', l: 'Viewing · 32 Mt Faber', tag: 'viewing' },
                { t: '16:30', l: 'OTP signing · D. Chua', tag: 'deal' },
              ].map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 2 ? `1px solid ${T.onyxLine}` : 'none', alignItems: 'center' }}>
                  <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, width: 56 }}>{e.t}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.l}</div>
                    <div style={{ marginTop: 4 }}>
                      <Chip tone={e.tag === 'deal' ? 'green' : e.tag === 'viewing' ? 'amber' : 'blue'} filled>{e.tag}</Chip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, warn }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H * 0.85 - 2}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={warn ? T.red : T.aqua} strokeWidth="1.6" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 2: Pipeline Kanban
// ────────────────────────────────────────────────────────────────────
function HFPipeline() {
  const stages = [
    { name: 'NEW', n: 7, leads: [
      { n: 'Tan Wei Ling', p: '+65 9123 4567', tags: [['blue', 'PR · BUY'], ['green', 'INTENT 5']], hot: true },
      { n: 'Aaron Lim', p: '+65 8742 1199', tags: [['blue', 'CITIZEN · BUY'], ['amber', 'INTENT 3']] },
      { n: 'Priya Sharma', p: '+65 9988 2017', tags: [['blue', 'EP · RENT'], ['amber', 'INTENT 3']] },
    ]},
    { name: 'CONTACTED', n: 12, leads: [
      { n: 'David Chua', p: '+65 8023 4471', tags: [['blue', 'PR · BUY'], ['red', 'ELIG WATCH']] },
      { n: 'Chen Ming', p: '+65 9612 3041', tags: [['blue', 'PR · RESALE']] },
    ]},
    { name: 'QUALIFIED', n: 8, leads: [
      { n: 'Sarah Kwok', p: '+65 8801 4499', tags: [['blue', 'CITIZEN · BUY'], ['green', 'VERIFIED']], hot: true },
      { n: 'Marcus Tan', p: '+65 9344 5621', tags: [['blue', 'CITIZEN']] },
    ]},
    { name: 'VIEWING BOOKED', n: 5, leads: [
      { n: 'Linh Pham', p: '+65 8215 0987', tags: [['amber', 'TOMORROW']], hot: true },
    ]},
    { name: 'VIEWING DONE', n: 3, leads: [
      { n: 'Joseph Khoo', p: '+65 8023 6611', tags: [['green', 'KEEN']] },
    ]},
    { name: 'NEGOTIATING', n: 2, leads: [
      { n: 'Rina Aziz', p: '+65 9774 2003', tags: [['green', 'OFFER MADE']] },
    ]},
  ];
  return (
    <div style={{ width: 1280, height: 800, background: T.onyx, color: T.white, display: 'flex', fontFamily: T.font, overflow: 'hidden' }}>
      <Sidebar active="pipeline" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageBar
          title="Pipeline"
          sub="37 active leads across 7 stages."
          right={<>
            <Btn ghost sm>Filters</Btn>
            <Btn ghost sm>List view</Btn>
            <Btn primary>+ New lead</Btn>
          </>}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', gap: 14 }}>
          {stages.map((s, si) => (
            <div key={si} style={{ minWidth: 270, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: si < 3 ? T.aqua : si < 5 ? T.blue : T.green }} />
                  <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 12, letterSpacing: 1.2 }}>{s.name}</div>
                </div>
                <span style={{ fontSize: 11, color: T.gray2, fontWeight: 600 }}>{s.n}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.leads.map((l, li) => (
                  <div key={li} style={{
                    background: T.onyx2, border: `1px solid ${l.hot ? 'rgba(142,254,255,0.4)' : T.onyxLine}`,
                    borderRadius: 14, padding: 14,
                    boxShadow: l.hot ? `0 0 0 0 ${T.aqua}` : 'none',
                    position: 'relative',
                  }}>
                    {l.hot && (
                      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.aqua, boxShadow: `0 0 8px ${T.aqua}` }} />
                        <span style={{ fontSize: 10, color: T.aqua, fontWeight: 700, letterSpacing: 0.6 }}>HOT</span>
                      </div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{l.n}</div>
                    <div style={{ fontSize: 11, color: T.gray2, marginTop: 2 }}>{l.p}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                      {l.tags.map(([tone, txt], ti) => (
                        <Chip key={ti} tone={tone} filled>{txt}</Chip>
                      ))}
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.onyxLine}`,
                    }}>
                      <span style={{ fontSize: 11, color: T.gray2 }}>2d ago</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <IconBtn>WA</IconBtn>
                        <IconBtn>Call</IconBtn>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{
                  border: `1px dashed ${T.onyxLine}`, borderRadius: 14,
                  padding: 12, textAlign: 'center', color: T.gray2, fontSize: 11,
                }}>+ drag here</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '3px 9px', borderRadius: 999, border: `1px solid ${T.onyxLine}`,
      fontSize: 10, color: T.gray2, fontWeight: 600, letterSpacing: 0.4,
    }}>{children}</span>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 3: Listing Detail with Area Insight as hero (distinctive moment 2)
// ────────────────────────────────────────────────────────────────────
function HFListingDetail() {
  return (
    <div style={{ width: 1280, height: 850, background: T.onyx, color: T.white, display: 'flex', fontFamily: T.font, overflow: 'hidden' }}>
      <Sidebar active="listings" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageBar
          title="32 Mt Faber Road · #08-12"
          sub="D03 · CONDO · 99-year · 980 sqft"
          right={<>
            <Btn ghost sm>Share</Btn>
            <Btn ghost sm>Edit</Btn>
            <Btn primary>Send to buyers</Btn>
          </>}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: 28, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
          {/* Left col */}
          <div>
            {/* Photo + price */}
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 280, background: 'linear-gradient(135deg, #2a3850, #0e1a2c)' }}>
              <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a2540"/>
                    <stop offset="100%" stopColor="#0e1825"/>
                  </linearGradient>
                </defs>
                <rect width="100" height="60" fill="url(#sky)"/>
                {Array.from({ length: 7 }).map((_, i) => (
                  <rect key={i} x={5 + i * 13} y={20 + (i % 3) * 4} width="9" height="40" fill="#1a2540" stroke="#2a3a5a" strokeWidth="0.2"/>
                ))}
                {Array.from({ length: 50 }).map((_, i) => (
                  <rect key={i} x={6 + (i % 7) * 13 + (Math.floor(i / 7) % 2) * 2} y={22 + Math.floor(i / 7) * 5} width="1.4" height="2" fill={Math.random() > 0.5 ? '#8EFEFF' : '#F7B85C'} opacity={0.5 + Math.random() * 0.4}/>
                ))}
              </svg>
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
                <Chip tone="green" filled>LIVE</Chip>
                <Chip tone="default" filled>SALE</Chip>
              </div>
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 36, letterSpacing: -0.8 }}>S$2,800,000</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>S$2,857 psf · 980 sqft</div>
                </div>
                <Btn primary sm>+18 photos</Btn>
              </div>
            </div>

            {/* Area Insight — hero, not buried */}
            <div style={{
              marginTop: 18, borderRadius: 16, padding: 24,
              background: T.onyx2, border: `1px solid ${T.onyxLine}`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                borderRadius: '50%', background: `radial-gradient(closest-side, rgba(40,89,247,0.4), transparent)`,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: T.aqua }} />
                  <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, color: T.aqua }}>AREA INSIGHT · D03</div>
                </div>
                <Btn ghost sm>↻ Refresh</Btn>
              </div>
              <div style={{ marginTop: 14, fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.92)', maxWidth: 620 }}>
                Mt Faber sits in a low-density Bukit Merah pocket. Recent transacted PSF in surrounding 99-year condos has held a tight $2,150–2,280 band over 12 months. Asking sits 3% above the median — defensible given the unobstructed harbour view.
              </div>

              {/* PSF chart */}
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.gray2, fontFamily: T.display, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>PSF · trailing 12 months · D03 condo</div>
                  <PSFChart />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.gray2, fontFamily: T.display, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>Talking points</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {['MRT 4 min walk · school catchment','Comp $2,180 psf, July 2025','67yr lease · still bank-fundable'].map((p, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${T.onyxLine}` : 'none' }}>
                        <span style={{ color: T.aqua }}>·</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'rgba(40,89,247,0.10)', border: '1px solid rgba(40,89,247,0.3)' }}>
                <div style={{ fontSize: 11, color: T.aqua, fontFamily: T.display, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>SELLER PITCH · TAP TO COPY</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>
                  "32 Mt Faber benchmarks at S$2,150 psf in the area. We're listing at S$2,857 psf — defensible given the unobstructed harbour view and remaining 67-year lease. Nearby comparables tell us this should move in 6–8 weeks at this price."
                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Matched buyers */}
            <div style={{ background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>Matched buyers</div>
                <span style={{ fontSize: 12, color: T.aqua, fontWeight: 600 }}>4 strong fits</span>
              </div>
              {[
                { n: 'Tan Wei Ling', m: 92, why: 'D03 · $2.5–3M · 3mo' },
                { n: 'Priya Sharma', m: 78, why: 'D03 · $2–3M · flex' },
                { n: 'Aaron Lim', m: 65, why: 'D02–04 · $2.4M cap' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: i < 2 ? `1px solid ${T.onyxLine}` : 'none', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: 'linear-gradient(135deg, #2859F7, #8EFEFF)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.n}</div>
                    <div style={{ fontSize: 11, color: T.gray2, marginTop: 2 }}>{b.why}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: b.m > 80 ? T.aqua : T.white }}>{b.m}</div>
                    <div style={{ fontSize: 10, color: T.gray2, letterSpacing: 0.4 }}>FIT</div>
                  </div>
                </div>
              ))}
              <Btn primary style={{ width: '100%', marginTop: 16 }}>Send WhatsApp to 3</Btn>
            </div>

            {/* Performance */}
            <div style={{ background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Performance</div>
              {[
                ['Days on market', '12'],
                ['Enquiries', '23'],
                ['Viewings booked', '4'],
                ['Offers received', '1'],
              ].map(([l, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${T.onyxLine}` : 'none' }}>
                  <span style={{ fontSize: 12, color: T.gray2 }}>{l}</span>
                  <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PSFChart() {
  // Simple line + area chart of PSF over 12 months
  const data = [2080, 2120, 2155, 2140, 2180, 2200, 2210, 2240, 2255, 2230, 2260, 2280];
  const W = 360, H = 140, P = 20;
  const max = 2300, min = 2050;
  const pts = data.map((v, i) => [P + (i / (data.length - 1)) * (W - P * 2), H - P - ((v - min) / (max - min)) * (H - P * 2)]);
  const linePts = pts.map(p => p.join(',')).join(' ');
  const areaPts = `${P},${H - P} ${linePts} ${W - P},${H - P}`;
  // Asking marker
  const askY = H - P - ((2857 - min) / (max - min)) * (H - P * 2);
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.aqua} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={T.aqua} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={P} y1={P + g * (H - P * 2)} x2={W - P} y2={P + g * (H - P * 2)} stroke={T.onyxLine} strokeDasharray="2 4"/>
      ))}
      <polygon points={areaPts} fill="url(#ar)"/>
      <polyline points={linePts} fill="none" stroke={T.aqua} strokeWidth="2"/>
      {pts.map((p, i) => i === pts.length - 1 && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill={T.aqua}/>
          <circle cx={p[0]} cy={p[1]} r="8" fill={T.aqua} opacity="0.2"/>
          <text x={p[0] - 4} y={p[1] - 12} fill={T.aqua} fontSize="11" textAnchor="end" fontWeight="700">$2,280</text>
        </g>
      ))}
      {/* asking line */}
      <line x1={P} y1={Math.max(askY, 8)} x2={W - P} y2={Math.max(askY, 8)} stroke={T.amber} strokeWidth="1.5" strokeDasharray="4 3"/>
      <text x={W - P - 4} y={Math.max(askY - 6, 14)} fill={T.amber} fontSize="10" textAnchor="end" fontWeight="700">ASKING $2,857</text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 4: Mobile pipeline (responsive)
// ────────────────────────────────────────────────────────────────────
function HFMobilePipeline() {
  return (
    <div style={{ width: 390, height: 800, background: T.onyx, color: T.white, fontFamily: T.font, display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <div style={{ padding: '14px 22px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
        <span>10:30</span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ width: 16, height: 9, border: '1px solid #fff', borderRadius: 2 }}/>
        </span>
      </div>
      {/* Header */}
      <div style={{ padding: '12px 22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <LogoMark size={28} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${T.onyxLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 4, height: 4, borderRadius: 999, background: T.aqua }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: T.onyx2, border: `1px solid ${T.onyxLine}` }} />
          </div>
        </div>
        <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 700, marginTop: 18, letterSpacing: -0.5 }}>Pipeline</div>
        <div style={{ fontSize: 12, color: T.gray2, marginTop: 4 }}>37 active · 3 hot</div>
      </div>
      {/* Stage scroller */}
      <div style={{ display: 'flex', gap: 6, padding: '0 18px 14px', overflow: 'hidden' }}>
        {[['NEW', 7, true], ['CONTACTED', 12], ['QUALIFIED', 8], ['VIEWING', 5], ['NEG', 3]].map(([s, n, on], i) => (
          <div key={i} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 11, fontFamily: T.display, fontWeight: 700, letterSpacing: 0.6,
            background: on ? T.aqua : T.onyx2, color: on ? T.onyx : T.gray2,
            border: `1px solid ${on ? T.aqua : T.onyxLine}`,
            display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
          }}>
            {s}<span style={{ opacity: 0.6 }}>{n}</span>
          </div>
        ))}
      </div>
      {/* Cards */}
      <div style={{ flex: 1, padding: '0 18px 100px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Tan Wei Ling', tag: 'PR · BUY', intent: 5, hot: true, brief: 'Replied 4h ago. Viewing tomorrow.' },
          { n: 'Aaron Lim', tag: 'CITIZEN · BUY', intent: 4, hot: false, brief: 'Asked about D02 condos.' },
          { n: 'Priya Sharma', tag: 'EP · RENT', intent: 3, hot: false, brief: 'New from FB ad · 2h ago.' },
        ].map((l, i) => (
          <div key={i} style={{
            background: T.onyx2, border: `1px solid ${l.hot ? 'rgba(142,254,255,0.4)' : T.onyxLine}`,
            borderRadius: 16, padding: 16, position: 'relative',
          }}>
            {l.hot && (
              <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: T.aqua, boxShadow: `0 0 8px ${T.aqua}` }} />
                <span style={{ fontSize: 10, color: T.aqua, fontWeight: 700, letterSpacing: 0.6 }}>HOT</span>
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>{l.n}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              <Chip tone="blue" filled>{l.tag}</Chip>
              <Chip tone={l.intent >= 4 ? 'green' : 'amber'} filled>INTENT {l.intent}</Chip>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: T.gray2, lineHeight: 1.4 }}>{l.brief}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <Btn primary sm style={{ flex: 1, padding: '8px 0' }}>WhatsApp</Btn>
              <Btn ghost sm style={{ flex: 1, padding: '8px 0' }}>Open</Btn>
            </div>
          </div>
        ))}
      </div>
      {/* Bottom nav */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: T.onyx, borderTop: `1px solid ${T.onyxLine}`,
        padding: '12px 18px 28px', display: 'flex', justifyContent: 'space-around',
      }}>
        {[['Home',false], ['Leads',false], ['Pipe',true], ['Chat',false], ['More',false]].map(([l, on], i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: 999, background: on ? T.aqua : T.gray2 }} />
            <div style={{ fontSize: 10, color: on ? T.white : T.gray2, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 5: Login (branded)
// ────────────────────────────────────────────────────────────────────
function HFLogin() {
  return (
    <div style={{ width: 1200, height: 760, fontFamily: T.font, display: 'flex' }}>
      {/* Brand panel */}
      <div style={{
        flex: 1, position: 'relative',
        background: 'linear-gradient(135deg, #859FF4 0%, #0C5AFF 32%, #0945E6 54%, #0840E1 82%, #0C5AFF 100%)',
        overflow: 'hidden', color: '#fff', padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ position: 'absolute', top: '20%', right: '-20%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(142,254,255,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <LogoMark size={36} />
          <div>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18 }}>PropAgent</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>built by 10thirtyLabs</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: T.display, fontSize: 44, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, maxWidth: 460 }}>
            Technology execution for Singapore property agents.
          </div>
          <div style={{ marginTop: 16, fontSize: 15, opacity: 0.85, maxWidth: 440, lineHeight: 1.55 }}>
            Every lead, viewing, and deal in one place. Built around the WhatsApp-and-FB workflow agents already use.
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 11, opacity: 0.7, letterSpacing: 0.4 }}>
          PDPA-aligned · CEA-aware · Singapore data residency
        </div>
      </div>
      {/* Form */}
      <div style={{ width: 480, background: T.onyx, color: T.white, padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: T.gray2, marginTop: 6 }}>Sign in to continue.</div>

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, color: T.gray2, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Email</div>
          <div style={{
            background: T.onyx2, border: `1px solid ${T.onyxLine}`,
            borderRadius: 12, padding: '12px 16px', fontSize: 14, color: T.gray2,
          }}>hoang@10thirtylabs.com</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.gray2, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Password</div>
          <div style={{
            background: T.onyx2, border: `1px solid ${T.onyxLine}`,
            borderRadius: 12, padding: '12px 16px', fontSize: 14, color: T.gray2,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>••••••••••</span>
            <span style={{ color: T.aqua, fontSize: 11, fontWeight: 600 }}>Forgot?</span>
          </div>
        </div>

        <Btn primary style={{ width: '100%', marginTop: 24, padding: '14px 0', fontSize: 14 }}>Sign in</Btn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: T.onyxLine }} />
          <span style={{ fontSize: 11, color: T.gray2 }}>or</span>
          <div style={{ flex: 1, height: 1, background: T.onyxLine }} />
        </div>
        <Btn ghost style={{ width: '100%', padding: '12px 0' }}>Continue with Google</Btn>

        <div style={{ marginTop: 32, fontSize: 12, color: T.gray2 }}>
          New here? <span style={{ color: T.aqua, fontWeight: 600 }}>Create an account</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// HI-FI 6: Messages with WhatsApp thread
// ────────────────────────────────────────────────────────────────────
function HFMessages() {
  const convos = [
    { n: 'Tan Wei Ling', m: 'Yes, 2br ok. Saturday works.', t: '14:02', u: 2, on: true },
    { n: 'Aaron Lim', m: 'When is the viewing?', t: '13:24', u: 1 },
    { n: 'Priya Sharma', m: '✓✓ Sent the brochure', t: '11:08' },
    { n: 'David Chua', m: '✓ Thanks!', t: 'Yesterday' },
    { n: 'Chen Ming', m: 'Floorplan attached', t: 'Mon' },
  ];
  return (
    <div style={{ width: 1280, height: 800, background: T.onyx, color: T.white, display: 'flex', fontFamily: T.font, overflow: 'hidden' }}>
      <Sidebar active="messages" />
      <div style={{ width: 320, borderRight: `1px solid ${T.onyxLine}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${T.onyxLine}` }}>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.4 }}>Messages</div>
          <div style={{ fontSize: 12, color: T.gray2, marginTop: 2 }}>WhatsApp · 1 number</div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 999, fontSize: 12, color: T.gray2 }}>
            Search contacts...
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {convos.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '14px 20px',
              background: c.on ? 'rgba(40,89,247,0.10)' : 'transparent',
              borderLeft: c.on ? `2px solid ${T.aqua}` : '2px solid transparent',
              borderBottom: `1px solid ${T.onyxLine}`, alignItems: 'center',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #2859F7, #8EFEFF)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.n}</span>
                  <span style={{ fontSize: 10, color: T.gray2 }}>{c.t}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 12, color: T.gray2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.m}</span>
                  {c.u && (
                    <span style={{ background: T.aqua, color: T.onyx, borderRadius: 999, padding: '0 8px', fontSize: 10, fontWeight: 700 }}>{c.u}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 28px', borderBottom: `1px solid ${T.onyxLine}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #2859F7, #8EFEFF)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Tan Wei Ling</div>
              <div style={{ fontSize: 11, color: T.gray2 }}>+65 9123 4567 · Lead in Qualified</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn ghost sm>View lead</Btn>
            <Btn ghost sm>Book viewing</Btn>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 12, background: 'radial-gradient(ellipse at top, rgba(40,89,247,0.06), transparent 60%)' }}>
          <Bubble side="them" t="11:00">Hi, saw your listing at Mt Faber. Still available?</Bubble>
          <Bubble side="me" t="11:02">Yes — 980 sqft 2br, $2.8M. Would Saturday 4pm suit a viewing?</Bubble>
          <SystemRow>Viewing draft created · 32 Mt Faber · Sat 4pm</SystemRow>
          <Bubble side="them" t="14:00">Will my husband come too. He's the decision maker. We're PR.</Bubble>
          <Bubble side="them" t="14:02">Yes, 2br ok. Saturday works.</Bubble>

          {/* Smart suggestion */}
          <div style={{
            border: '1px solid rgba(142,254,255,0.4)', borderRadius: 14, padding: 14,
            background: 'rgba(40,89,247,0.10)', maxWidth: 460, alignSelf: 'flex-start',
          }}>
            <div style={{ fontSize: 11, fontFamily: T.display, fontWeight: 700, letterSpacing: 0.8, color: T.aqua }}>SUGGESTED REPLY · BASED ON HER BRIEF</div>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              "Confirmed — Saturday 4pm at 32 Mt Faber. I'll send the lobby code Friday evening. Last unit in the stack closed at $2,180 psf, so we're well-positioned to discuss pricing."
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <Btn primary sm>Send</Btn>
              <Btn ghost sm>Edit</Btn>
            </div>
          </div>
        </div>
        {/* Composer */}
        <div style={{ padding: 20, borderTop: `1px solid ${T.onyxLine}`, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: T.onyx2, border: `1px solid ${T.onyxLine}`, borderRadius: 999, padding: '12px 18px', fontSize: 13, color: T.gray2 }}>Reply via WhatsApp...</div>
          <Btn primary>Send</Btn>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, t, children }) {
  const me = side === 'me';
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 460 }}>
      <div style={{
        background: me ? T.blue : T.onyx2,
        border: me ? 'none' : `1px solid ${T.onyxLine}`,
        color: me ? '#fff' : T.white,
        padding: '10px 16px',
        borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        fontSize: 13, lineHeight: 1.45,
      }}>{children}</div>
      <div style={{ fontSize: 10, color: T.gray2, marginTop: 4, textAlign: me ? 'right' : 'left' }}>{t}</div>
    </div>
  );
}

function SystemRow({ children }) {
  return (
    <div style={{ alignSelf: 'center', fontSize: 10, color: T.gray2, padding: '4px 12px', background: T.onyx2, borderRadius: 999, border: `1px solid ${T.onyxLine}`, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600, fontFamily: T.display }}>{children}</div>
  );
}

Object.assign(window, { HFDashboard, HFPipeline, HFListingDetail, HFMobilePipeline, HFLogin, HFMessages });

// Low-fi wireframe sketches — reverse-engineered from current proptool codebase.
// Sketchy / hand-drawn aesthetic. B&W with one accent color (light blue) + minimal red flags.

const wfStyles = {
  font: '"Kalam", "Caveat", "Architects Daughter", system-ui, sans-serif',
  ink: '#1a1a1a',
  ink2: '#5a5a5a',
  ink3: '#9a9a9a',
  paper: '#fdfcf8',
  rule: '#2a2a2a',
  hatch: '#e8e6df',
  accent: '#5b8cff',
  accentSoft: '#dbe5ff',
  warn: '#d04545',
  warnSoft: '#fadcdc',
};

// Sketchy box - rough border using filter
function Box({ children, style, dashed, fill, thick, accent, ...rest }) {
  const border = `${thick ? 2.5 : 1.6}px ${dashed ? 'dashed' : 'solid'} ${accent ? wfStyles.accent : wfStyles.rule}`;
  return (
    <div
      {...rest}
      style={{
        border,
        borderRadius: 6,
        background: fill || 'transparent',
        boxShadow: thick ? '2px 3px 0 rgba(0,0,0,0.15)' : '1.5px 2px 0 rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Squiggle({ width = '60%', height = 8, style }) {
  // Hand-drawn underline
  return (
    <svg width={width} height={height} viewBox="0 0 200 8" preserveAspectRatio="none" style={style}>
      <path d="M2 5 Q 30 1, 60 4 T 120 5 T 198 4" stroke={wfStyles.ink} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function Pen({ children, size = 14, weight = 600, color = wfStyles.ink, style }) {
  return (
    <span style={{ fontFamily: wfStyles.font, fontSize: size, fontWeight: weight, color, ...style }}>
      {children}
    </span>
  );
}

function Circle({ size = 14, fill = '#fff', style }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      border: `1.5px solid ${wfStyles.rule}`, background: fill, ...style,
    }} />
  );
}

function Tag({ children, accent, warn, fill }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      border: `1.3px solid ${warn ? wfStyles.warn : accent ? wfStyles.accent : wfStyles.rule}`,
      background: fill || 'transparent',
      fontFamily: wfStyles.font, fontSize: 11, fontWeight: 500,
      color: warn ? wfStyles.warn : accent ? wfStyles.accent : wfStyles.ink,
    }}>{children}</span>
  );
}

function Line({ width = '70%', thick }) {
  return <div style={{ height: 0, borderTop: `${thick ? 1.6 : 1.2}px solid ${wfStyles.ink2}`, width, marginTop: 4, marginBottom: 4 }} />;
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 1. Dashboard (mobile + desktop)
// ────────────────────────────────────────────────────────────────────
function WFDashboardDesktop() {
  return (
    <div style={{ width: 1080, height: 720, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, padding: 0, display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 200, borderRight: `1.4px solid ${wfStyles.rule}`, padding: '20px 14px' }}>
        <Pen size={20} weight={700}>PropAgent</Pen>
        <Pen size={10} color={wfStyles.ink3} style={{ display: 'block', marginTop: 2 }}>Singapore</Pen>
        <div style={{ height: 24 }} />
        {['Dashboard ●','Leads','Pipeline','Listings','Viewings','Messages','Deals','Tools','Settings'].map((l, i) => (
          <div key={i} style={{ padding: '7px 8px', marginBottom: 2, borderRadius: 5, background: i === 0 ? wfStyles.accentSoft : 'transparent' }}>
            <Pen size={13} weight={i === 0 ? 700 : 500} color={i === 0 ? wfStyles.accent : wfStyles.ink}>○ {l.replace(' ●','')}</Pen>
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: 28 }}>
        <Pen size={26} weight={700}>Dashboard</Pen>
        <Pen size={13} color={wfStyles.ink2} style={{ display: 'block', marginTop: 4 }}>Your property business at a glance</Pen>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 22 }}>
          {[
            { l: 'Active Leads', v: '24' },
            { l: 'New This Week', v: '7' },
            { l: 'Viewings', v: '5' },
            { l: 'Overdue Tasks', v: '3', warn: true },
          ].map((k, i) => (
            <Box key={i} style={{ padding: 16 }}>
              <Pen size={12} color={wfStyles.ink2}>{k.l}</Pen>
              <div style={{ marginTop: 6 }}>
                <Pen size={32} weight={700} color={k.warn ? wfStyles.warn : wfStyles.ink}>{k.v}</Pen>
              </div>
            </Box>
          ))}
        </div>

        <Box style={{ padding: 20, marginTop: 22 }}>
          <Pen size={16} weight={700}>Quick Actions</Pen>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
            {['Add Lead','Pipeline','Add Listing','Messages'].map((a, i) => (
              <Box key={i} style={{ padding: 18, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, border: `1.4px solid ${wfStyles.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pen size={16}>+</Pen>
                </div>
                <Pen size={12} weight={600}>{a}</Pen>
              </Box>
            ))}
          </div>
        </Box>

        <div style={{ marginTop: 18, padding: 14, border: `1.4px dashed ${wfStyles.warn}`, borderRadius: 6, background: wfStyles.warnSoft, opacity: 0.85 }}>
          <Pen size={12} weight={700} color={wfStyles.warn}>OBSERVATIONS</Pen>
          <Pen size={12} color={wfStyles.warn} style={{ display: 'block', marginTop: 4 }}>
            • Generic Tailwind cards · no brand presence<br/>
            • Emoji icons (against 10TL brand: "no emoji, ever")<br/>
            • KPIs are flat numbers · no trend, no story<br/>
            • No "what to do next" prompt — agent has to navigate<br/>
            • Quick Actions feel decorative · low utility
          </Pen>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 2. Pipeline (Kanban)
// ────────────────────────────────────────────────────────────────────
function WFPipelineDesktop() {
  const stages = [
    { name: 'New Lead', n: 6 },
    { name: 'Contacted', n: 4 },
    { name: 'Qualified', n: 3 },
    { name: 'Viewing Booked', n: 2 },
    { name: 'Viewing Done', n: 2 },
    { name: 'Negotiating', n: 1 },
    { name: 'OTP Issued', n: 1 },
  ];
  return (
    <div style={{ width: 1280, height: 720, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, padding: 0 }}>
      <div style={{ padding: '16px 24px', borderBottom: `1.4px solid ${wfStyles.rule}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Pen size={22} weight={700}>Pipeline</Pen>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Box style={{ padding: '6px 12px' }}><Pen size={12}>List View</Pen></Box>
          <Box style={{ padding: '6px 12px' }} fill={wfStyles.accent}><Pen size={12} color="#fff" weight={700}>+ Add Lead</Pen></Box>
        </div>
      </div>

      <div style={{ padding: 18, display: 'flex', gap: 12, overflow: 'hidden' }}>
        {stages.map((s, si) => (
          <div key={si} style={{ minWidth: 200, background: wfStyles.hatch, borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Pen size={13} weight={700}>{s.name}</Pen>
              <Pen size={11} color={wfStyles.ink2} style={{ background: '#fff', padding: '1px 7px', borderRadius: 999 }}>{s.n}</Pen>
            </div>
            {Array.from({ length: Math.min(s.n, 3) }).map((_, ci) => (
              <Box key={ci} style={{ padding: 10, marginBottom: 6 }} fill="#fff">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Pen size={12} weight={700}>○ Lead Name</Pen>
                  <Pen size={11}>🔥</Pen>
                </div>
                <Pen size={10} color={wfStyles.ink2} style={{ display: 'block', marginTop: 2 }}>+65 9123 4567</Pen>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  <Tag>buyer</Tag>
                  {ci % 2 === 0 && <Tag warn>● Eligibility</Tag>}
                  <Tag accent>Intent 4/5</Tag>
                </div>
                <Line />
                <Pen size={10} color={wfStyles.ink3}>2d ago</Pen>
              </Box>
            ))}
          </div>
        ))}
      </div>

      <div style={{ margin: '0 24px', padding: 12, border: `1.4px dashed ${wfStyles.warn}`, borderRadius: 6, background: wfStyles.warnSoft }}>
        <Pen size={12} weight={700} color={wfStyles.warn}>OBSERVATIONS</Pen>
        <Pen size={12} color={wfStyles.warn} style={{ display: 'block', marginTop: 4 }}>
          • Cards feel like dev placeholders · badges fight for attention<br/>
          • 9 stages on screen at once → cards too narrow to read · stage selector dropdown duplicates drag<br/>
          • No way to spot the agent&apos;s most urgent lead at a glance · "where do I start?"<br/>
          • Eligibility flag uses red dot only — agent could miss it on a busy board
        </Pen>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 3. Listings grid
// ────────────────────────────────────────────────────────────────────
function WFListingsMobile() {
  return (
    <div style={{ width: 390, height: 720, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px 12px', borderBottom: `1.4px solid ${wfStyles.rule}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Pen size={20} weight={700}>Listings</Pen>
            <Pen size={11} color={wfStyles.ink2} style={{ display: 'block' }}>Manage your properties</Pen>
          </div>
          <Box fill={wfStyles.accent} style={{ padding: '6px 12px' }}><Pen size={11} color="#fff" weight={700}>+ New</Pen></Box>
        </div>
        <div style={{ display: 'flex', gap: 4, background: wfStyles.hatch, padding: 4, borderRadius: 6, marginTop: 12 }}>
          {['All','Sale','Rental','Draft'].map((t, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 4, background: i === 0 ? '#fff' : 'transparent' }}>
              <Pen size={11} weight={i === 0 ? 700 : 500}>{t}</Pen>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i}>
            <div style={{ aspectRatio: '4/3', background: wfStyles.hatch, position: 'relative', borderBottom: `1.4px solid ${wfStyles.rule}` }}>
              <svg width="100%" height="100%" viewBox="0 0 100 75" preserveAspectRatio="none">
                <path d="M0 75 L0 50 L25 30 L50 50 L75 25 L100 45 L100 75 Z" fill={wfStyles.ink3} opacity="0.25"/>
                <line x1="0" y1="0" x2="100" y2="75" stroke={wfStyles.ink3} strokeWidth="0.4"/>
                <line x1="100" y1="0" x2="0" y2="75" stroke={wfStyles.ink3} strokeWidth="0.4"/>
              </svg>
              <span style={{ position: 'absolute', top: 6, left: 6 }}><Tag accent fill="#fff">live</Tag></span>
              <span style={{ position: 'absolute', top: 6, right: 6 }}><Tag fill="#fff">{i % 2 ? 'Rent' : 'Sale'}</Tag></span>
            </div>
            <div style={{ padding: 8 }}>
              <Pen size={11} weight={700}>123 Tanglin Rd #12-3</Pen>
              <Pen size={9} color={wfStyles.ink2} style={{ display: 'block' }}>D10 · CONDO</Pen>
              <Pen size={12} weight={700} style={{ display: 'block', marginTop: 4 }}>$2.8M</Pen>
              <Pen size={9} color={wfStyles.ink2} style={{ display: 'block' }}>$2,150 psf</Pen>
            </div>
          </Box>
        ))}
      </div>
      <div style={{ padding: 8, borderTop: `1.4px solid ${wfStyles.rule}`, display: 'flex', justifyContent: 'space-around' }}>
        {['Home','Leads','Pipe','Chat','More'].map((l, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Circle size={20} />
            <Pen size={9} style={{ display: 'block', marginTop: 2 }}>{l}</Pen>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 4. Lead detail with Area Insight (the killer surface)
// ────────────────────────────────────────────────────────────────────
function WFLeadDetail() {
  return (
    <div style={{ width: 1080, height: 800, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, display: 'flex' }}>
      {/* Left col – contact */}
      <div style={{ width: 320, borderRight: `1.4px solid ${wfStyles.rule}`, padding: 22 }}>
        <Pen size={11} color={wfStyles.ink2}>← Pipeline</Pen>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <Circle size={48} fill={wfStyles.accentSoft} />
          <div>
            <Pen size={18} weight={700}>Tan Wei Ling</Pen>
            <Pen size={11} color={wfStyles.ink2} style={{ display: 'block' }}>+65 9123 4567</Pen>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <Tag accent>buyer</Tag>
          <Tag>condo</Tag>
          <Tag>🔥 hot</Tag>
        </div>

        <Pen size={10} color={wfStyles.ink2} weight={700} style={{ display: 'block', marginTop: 22, letterSpacing: 1 }}>QUALIFICATION</Pen>
        <Squiggle width="100%" />
        {[
          ['Residency', 'PR'],
          ['Property owned', 'None'],
          ['Budget', '$2.5M – $3M'],
          ['Timeline', '3 months'],
          ['Verification', '🟡 Medium'],
          ['Eligibility', '🟢 OK'],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${wfStyles.ink3}` }}>
            <Pen size={11} color={wfStyles.ink2}>{k}</Pen>
            <Pen size={11} weight={600}>{v}</Pen>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 16 }}>
          <Box style={{ padding: '8px 0', textAlign: 'center' }}><Pen size={11} weight={600}>Call</Pen></Box>
          <Box style={{ padding: '8px 0', textAlign: 'center' }} fill={wfStyles.accentSoft}><Pen size={11} weight={600}>WhatsApp</Pen></Box>
          <Box style={{ padding: '8px 0', textAlign: 'center' }}><Pen size={11} weight={600}>Note</Pen></Box>
          <Box style={{ padding: '8px 0', textAlign: 'center' }}><Pen size={11} weight={600}>Verify ID</Pen></Box>
        </div>
      </div>

      {/* Center – timeline */}
      <div style={{ flex: 1, padding: 22 }}>
        <Pen size={11} color={wfStyles.ink2} weight={700} style={{ letterSpacing: 1 }}>TIMELINE</Pen>
        <Squiggle width="20%" />
        {[
          { t: 'today 14:32', l: 'Lead → Qualified' },
          { t: 'today 14:30', l: 'Note: confirmed PR status, budget firm' },
          { t: 'today 11:02', l: 'WhatsApp ▸ inbound: "Yes, 2br ok"' },
          { t: 'yesterday', l: 'Viewing booked: 32 Mt Faber #08-12' },
          { t: '3d ago', l: 'Lead from Facebook Ad — Condo D03' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingTop: 14 }}>
            <div style={{ width: 80, paddingTop: 1 }}><Pen size={10} color={wfStyles.ink3}>{e.t}</Pen></div>
            <div style={{ flex: 1 }}>
              <Box style={{ padding: 10 }}><Pen size={12}>{e.l}</Pen></Box>
            </div>
          </div>
        ))}
      </div>

      {/* Right – viewing prep & buyer fit */}
      <div style={{ width: 320, borderLeft: `1.4px solid ${wfStyles.rule}`, padding: 22 }}>
        <Pen size={11} color={wfStyles.ink2} weight={700} style={{ letterSpacing: 1 }}>VIEWING PREP</Pen>
        <Squiggle width="40%" />
        <Box accent style={{ padding: 12, marginTop: 8 }} fill={wfStyles.accentSoft}>
          <Pen size={12} weight={700}>32 Mt Faber #08-12</Pen>
          <Pen size={10} color={wfStyles.ink2} style={{ display: 'block', marginTop: 2 }}>Tomorrow · 4:00pm</Pen>
          <Line />
          <Pen size={11} weight={600}>3 talking points</Pen>
          {['MRT 4 min walk · school catchment','Recent unit sold $2,180 psf','Tenure 99yr — 67yrs left'].map((p, i) => (
            <Pen key={i} size={11} style={{ display: 'block', marginTop: 4 }}>· {p}</Pen>
          ))}
        </Box>

        <Pen size={11} color={wfStyles.ink2} weight={700} style={{ display: 'block', marginTop: 22, letterSpacing: 1 }}>BUYER FIT</Pen>
        <Squiggle width="40%" />
        <Pen size={11} weight={700} color={wfStyles.accent} style={{ display: 'block', marginTop: 8 }}>✓ Signals</Pen>
        <Pen size={10} style={{ display: 'block' }}>· District match (D03 wanted)</Pen>
        <Pen size={10} style={{ display: 'block' }}>· Budget within $2.5–3M</Pen>
        <Pen size={11} weight={700} color={wfStyles.warn} style={{ display: 'block', marginTop: 8 }}>! Watchouts</Pen>
        <Pen size={10} color={wfStyles.warn} style={{ display: 'block' }}>· 2br but buyer wants 3br</Pen>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 5. Messages (mobile)
// ────────────────────────────────────────────────────────────────────
function WFMessagesMobile() {
  return (
    <div style={{ width: 390, height: 720, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px 14px', borderBottom: `1.4px solid ${wfStyles.rule}` }}>
        <Pen size={20} weight={700}>Messages</Pen>
        <Pen size={11} color={wfStyles.ink2} style={{ display: 'block' }}>WhatsApp conversations</Pen>
        <Box style={{ marginTop: 12, padding: '8px 12px' }} fill={wfStyles.hatch}>
          <Pen size={11} color={wfStyles.ink2}>○ Search contacts...</Pen>
        </Box>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {[
          { n: 'Tan Wei Ling', m: '"Yes, 2br ok"', t: '14:02', u: 2 },
          { n: 'Aaron Lim', m: '"When is the viewing?"', t: '13:24', u: 1 },
          { n: 'Priya Sharma', m: '✓✓ Sent the brochure', t: '11:08', u: 0 },
          { n: 'David Chua', m: '✓ Thanks!', t: 'Yesterday', u: 0 },
          { n: 'Chen Ming', m: '📎 Floorplan.pdf', t: 'Mon', u: 0 },
          { n: 'Sarah Kwok', m: '"Interested in resale"', t: '6 May', u: 0 },
          { n: 'Marcus Tan', m: '✓✓ Will check', t: '5 May', u: 0 },
        ].map((c, i) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: `1px solid ${wfStyles.hatch}`, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Circle size={40} fill={wfStyles.accentSoft} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Pen size={13} weight={700}>{c.n}</Pen>
                <Pen size={10} color={wfStyles.ink3}>{c.t}</Pen>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <Pen size={11} color={wfStyles.ink2}>{c.m}</Pen>
                {c.u > 0 && (
                  <span style={{ background: wfStyles.accent, color: '#fff', borderRadius: 999, padding: '0 7px', fontSize: 10, fontWeight: 700, fontFamily: wfStyles.font }}>{c.u}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// WIREFRAME: 6. Auth — Login
// ────────────────────────────────────────────────────────────────────
function WFLogin() {
  return (
    <div style={{ width: 720, height: 720, background: wfStyles.paper, fontFamily: wfStyles.font, color: wfStyles.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Pen size={26} weight={700}>Welcome back</Pen>
          <Pen size={13} color={wfStyles.ink2} style={{ display: 'block', marginTop: 6 }}>Sign in to PropAgent SG</Pen>
        </div>
        <Pen size={11} weight={700}>Email</Pen>
        <Box style={{ padding: '10px 12px', marginTop: 4 }}><Pen size={12} color={wfStyles.ink3}>you@example.com</Pen></Box>
        <Pen size={11} weight={700} style={{ display: 'block', marginTop: 14 }}>Password</Pen>
        <Box style={{ padding: '10px 12px', marginTop: 4 }}><Pen size={12} color={wfStyles.ink3}>••••••••</Pen></Box>
        <Box fill={wfStyles.accent} style={{ padding: 12, marginTop: 18, textAlign: 'center' }} thick>
          <Pen size={13} color="#fff" weight={700}>Sign In</Pen>
        </Box>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, borderTop: `1px solid ${wfStyles.ink3}` }} />
          <Pen size={10} color={wfStyles.ink2}>or</Pen>
          <div style={{ flex: 1, borderTop: `1px solid ${wfStyles.ink3}` }} />
        </div>
        <Box style={{ padding: 12, textAlign: 'center' }}><Pen size={12} weight={600}>Continue with Google</Pen></Box>
        <Pen size={11} color={wfStyles.ink2} style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
          No account? <span style={{ color: wfStyles.accent, fontWeight: 700 }}>Sign up</span>
        </Pen>
      </div>
    </div>
  );
}

Object.assign(window, { WFDashboardDesktop, WFPipelineDesktop, WFListingsMobile, WFLeadDetail, WFMessagesMobile, WFLogin });

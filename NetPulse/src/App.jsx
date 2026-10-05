'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, LayoutDashboard, Server, TriangleAlert, FileChartColumn, ChevronRight, RefreshCw, Plus, Search, Download, Globe, ShieldCheck, Network, Database, CreditCard, Mail, CircleCheck, Clock3, Pause, Play, Check, Radio, CircleHelp, Gauge, X } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Toaster } from '@/components/ui/sonner';
import { LatencyChart, HealthStrip } from '@/components/netpulse/charts';
import { STATUS_LABELS, STORAGE_KEY, SEED_TIME, createDemoWorkspace, makeLiveWorkspace, summarize, availability, inWindow, applyChecks, demoChecks, validateDemoService, servicesCsv, readSavedWorkspace } from '@/lib/netpulse/model';

const NAV = [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'services', label: 'Services', icon: Server }, { id: 'incidents', label: 'Incidents', icon: TriangleAlert }, { id: 'reports', label: 'Reports', icon: FileChartColumn }];
const ICONS = { gateway: Network, lock: ShieldCheck, globe: Globe, credit: CreditCard, network: Network, database: Database, mail: Mail, search: Search };
const pct = n => n === null ? '—' : `${n.toFixed(2)}%`;
const ms = n => n === null || n === undefined ? '—' : `${n} ms`;
const time = at => at ? new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) : 'Not checked';
function elapsed(at, now) { if (!at) return 'Not checked'; const seconds = Math.max(0, Math.floor((now - at) / 1000)); return seconds < 60 ? `${seconds}s ago` : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : `${Math.floor(seconds / 3600)}h ago`; }

function Status({ service }) { const status = service.enabled === false ? 'paused' : service.status; return <span className={`status-pill ${status}`}><span/>{status === 'paused' ? 'Paused' : STATUS_LABELS[status]}</span>; }
function NavButton({ item, view, onNavigate, badge }) { const { setOpenMobile } = useSidebar(); const Icon = item.icon; return <SidebarMenuItem><SidebarMenuButton isActive={view === item.id} onClick={() => { onNavigate(item.id); setOpenMobile(false); }} className="nav-button"><Icon/><span>{item.label}</span>{badge > 0 && <span className="nav-count">{badge}</span>}</SidebarMenuButton></SidebarMenuItem>; }
function FilterSelect({ value, onChange, label, options }) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="filter-select"><SelectValue/></SelectTrigger><SelectContent>{options.map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}</SelectContent></Select>; }

export default function NetPulse() {
  const [workspace, setWorkspace] = useState(() => createDemoWorkspace(SEED_TIME));
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('overview');
  const [window, setWindow] = useState('24h');
  const [now, setNow] = useState(SEED_TIME);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [incidentFilter, setIncidentFilter] = useState('active');
  const [addOpen, setAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', url: '', thresholdMs: '500', group: 'Core services' });
  const stateRef = useRef(workspace);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const storageWarned = useRef(false);
  stateRef.current = workspace;

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function initialize() {
      const current = Date.now();
      setNow(current);
      let mode = 'demo';
      try { mode = localStorage.getItem(`${STORAGE_KEY}.mode`) === 'live' ? 'live' : 'demo'; setAuto(localStorage.getItem(`${STORAGE_KEY}.auto`) !== 'false'); } catch {}
      let result = null;
      try { result = readSavedWorkspace(localStorage.getItem(`${STORAGE_KEY}.${mode}`), mode); } catch {}
      if (mode === 'live') {
        try {
          const response = await fetch('/api/targets');
          if (!response.ok) throw new Error('Could not load live targets.');
          const { targets } = await response.json();
          const fresh = makeLiveWorkspace(targets, current);
          if (result) { fresh.services = fresh.services.map(s => { const old = result.services.find(o => o.id === s.id && o.url === s.url); return old ? { ...s, enabled: old.enabled, status: old.status, latencyMs: old.latencyMs, lastChecked: old.lastChecked, history: old.history, error: old.error } : s; }); fresh.incidents = result.incidents.filter(i => fresh.services.some(s => s.id === i.serviceId)); }
          result = fresh;
        } catch { mode = 'demo'; result = createDemoWorkspace(current); if (!cancelled) setError('Live targets could not be loaded. Demo mode is available.'); }
      }
      if (!cancelled) { setWorkspace(result || createDemoWorkspace(current)); setLoaded(true); }
    }
    initialize();
    const timer = globalThis.setInterval(() => setNow(Date.now()), 10000);
    return () => { cancelled = true; mounted.current = false; globalThis.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(`${STORAGE_KEY}.${workspace.mode}`, JSON.stringify(workspace)); localStorage.setItem(`${STORAGE_KEY}.mode`, workspace.mode); localStorage.setItem(`${STORAGE_KEY}.auto`, String(auto)); }
    catch { if (!storageWarned.current) { storageWarned.current = true; toast.warning('Browser storage is unavailable or full. Changes will last for this session.'); } }
  }, [workspace, auto, loaded]);

  const runChecks = useCallback(async (quiet = false) => {
    if (inFlight.current) return;
    const snapshot = stateRef.current;
    const services = snapshot.services.filter(s => s.enabled);
    if (!services.length) { if (!quiet) toast.info('Resume a service before running checks.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      let checks;
      if (snapshot.mode === 'demo') checks = demoChecks(services, Date.now());
      else {
        const response = await fetch('/api/checks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: services.map(s => s.id) }), signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Checks could not be completed.');
        checks = data.checks;
      }
      if (mounted.current && stateRef.current.mode === snapshot.mode) {
        const stamp = Date.now(); setNow(stamp); setWorkspace(w => applyChecks(w, checks, stamp));
        if (!quiet) toast.success(`${checks.length} ${snapshot.mode === 'demo' ? 'simulated' : 'HTTP'} checks completed`);
      }
    } catch (e) { if (mounted.current) { setError(e.name === 'TimeoutError' ? 'The check request timed out. Try again.' : e.message); if (!quiet) toast.error('Unable to complete checks'); } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }, []);

  useEffect(() => {
    if (!loaded || !auto) return;
    const timer = globalThis.setInterval(() => { if (document.visibilityState === 'visible') runChecks(true); }, 30000);
    return () => globalThis.clearInterval(timer);
  }, [loaded, auto, runChecks]);

  async function changeMode(mode) {
    if (!loaded || busy || mode === workspace.mode) return;
    setError(''); setBusy(true); inFlight.current = true;
    try {
      let saved = null;
      try { saved = readSavedWorkspace(localStorage.getItem(`${STORAGE_KEY}.${mode}`), mode); } catch {}
      let next;
      if (mode === 'live') {
        const response = await fetch('/api/targets', { signal: AbortSignal.timeout(10000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load live targets.');
        next = makeLiveWorkspace(data.targets);
        if (saved) { next.services = next.services.map(s => { const old = saved.services.find(o => o.id === s.id && o.url === s.url); return old ? { ...s, enabled: old.enabled, status: old.status, latencyMs: old.latencyMs, lastChecked: old.lastChecked, history: old.history } : s; }); next.incidents = saved.incidents.filter(i => next.services.some(s => s.id === i.serviceId)); }
      } else next = saved || createDemoWorkspace(Date.now());
      setWorkspace(next); setNow(Date.now()); setQuery(''); setStatusFilter('all'); setGroupFilter('all'); setSelectedId(null);
      toast.info(mode === 'live' ? 'Live HTTP mode · run a check to measure your endpoints' : 'Demo mode · data is simulated');
    } catch (e) { setError(e.message); toast.error('Could not switch monitoring mode'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  function addService(event) {
    event.preventDefault(); setFormError('');
    try {
      if (workspace.services.length >= 30) throw new Error('This learning workspace supports up to 30 demo services.');
      const valid = validateDemoService(form);
      if (workspace.services.some(s => s.url === valid.url)) throw new Error('That endpoint is already in your workspace.');
      const stamp = Date.now();
      const service = { ...valid, id: `demo-${stamp}`, baseline: 80, region: 'Demo region', icon: 'globe', enabled: true, status: 'unknown', latencyMs: null, lastChecked: null, history: [] };
      setWorkspace(w => ({ ...w, services: [...w.services, service] })); setAddOpen(false); setForm({ name: '', url: '', thresholdMs: '500', group: 'Core services' }); toast.success('Demo service added. Run a check to collect its first sample.');
    } catch (e) { setFormError(e.message); }
  }
  function toggleService(id) { setWorkspace(w => ({ ...w, services: w.services.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s) })); }
  function acknowledge(id) { setWorkspace(w => ({ ...w, incidents: w.incidents.map(i => i.id === id ? { ...i, status: 'acknowledged' } : i) })); toast.success('Incident acknowledged'); }
  function exportCsv() { const blob = new Blob([servicesCsv(workspace.services, window, now)], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `netpulse-${workspace.mode}-${window}-${new Date(now).toISOString().slice(0, 10)}.csv`; a.click(); globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000); toast.success('Service report downloaded'); }

  const metrics = useMemo(() => summarize(workspace.services, window, now), [workspace.services, window, now]);
  const activeIncidents = workspace.incidents.filter(i => i.status !== 'resolved');
  const groups = [...new Set(workspace.services.map(s => s.group))];
  const filtered = workspace.services.filter(s => (statusFilter === 'all' || (statusFilter === 'paused' ? !s.enabled : s.enabled && s.status === statusFilter)) && (groupFilter === 'all' || s.group === groupFilter) && `${s.name} ${s.url} ${s.group}`.toLowerCase().includes(query.toLowerCase()));
  const selected = workspace.services.find(s => s.id === selectedId);
  const visibleIncidents = workspace.incidents.filter(i => incidentFilter === 'all' || (incidentFilter === 'active' ? i.status !== 'resolved' : i.status === incidentFilter));

  // Optional browser agent support reuses the visible read/filter/check actions.
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const register = tool => { try { Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {}); } catch {} };
    register({ name: 'read_netpulse_services', description: 'Read the currently visible workspace service status and latest measurements.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: input => { if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object.'); return { mode: stateRef.current.mode, services: stateRef.current.services.map(s => ({ id: s.id, name: s.name, status: s.status, enabled: s.enabled, latencyMs: s.latencyMs, lastChecked: s.lastChecked })) }; } });
    register({ name: 'filter_netpulse_services', description: 'Open Services and filter the visible table by service name or endpoint.', inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 120 } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async input => { if (!input || typeof input.query !== 'string' || input.query.length > 120 || Object.keys(input).some(k => k !== 'query')) throw new Error('A query string up to 120 characters is required.'); setView('services'); setQuery(input.query); setStatusFilter('all'); setGroupFilter('all'); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); return { query: input.query, matches: stateRef.current.services.filter(s => `${s.name} ${s.url} ${s.group}`.toLowerCase().includes(input.query.toLowerCase())).length }; } });
    return () => controller.abort();
  }, []);

  const serviceTable = <section className="panel services-panel" aria-labelledby="services-title"><div className="panel-heading"><div><h2 id="services-title">Monitored services <span className="count-badge">{workspace.services.length}</span></h2><p>Health and availability across your endpoints</p></div><Button variant="outline" onClick={() => workspace.mode === 'demo' ? setAddOpen(true) : setHelpOpen(true)} className="secondary-button"><Plus size={16}/>{workspace.mode === 'demo' ? 'Add service' : 'Configure targets'}</Button></div>
    <div className="table-controls"><div className="search-field"><Search size={17}/><Input aria-label="Search services" placeholder="Search services or endpoints…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}</div><div className="table-filters"><FilterSelect value={statusFilter} onChange={setStatusFilter} label="Filter by service status" options={[[ 'all', 'All statuses' ], ...Object.entries(STATUS_LABELS), ['paused', 'Paused']]}/><FilterSelect value={groupFilter} onChange={setGroupFilter} label="Filter by group" options={[[ 'all', 'All groups' ], ...groups.map(g => [g, g])]}/></div></div>
    <Table className="service-table"><TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Status</TableHead><TableHead>Response time</TableHead><TableHead>Availability <span className="muted">{window}</span></TableHead><TableHead>Check history</TableHead><TableHead className="text-right">Last checked</TableHead></TableRow></TableHeader><TableBody>{filtered.map(s => { const Icon = ICONS[s.icon] || Globe; const history = inWindow(s.history, window, now); return <TableRow key={s.id}><TableCell><button className="service-link" onClick={() => setSelectedId(s.id)}><span className={`service-icon ${s.icon}`}><Icon size={18}/></span><span><strong>{s.name}</strong><small>{s.url.replace('https://', '')}</small></span></button></TableCell><TableCell><Status service={s}/></TableCell><TableCell><span className={s.status === 'degraded' && s.enabled ? 'slow-text' : 'measurement'}>{ms(s.latencyMs)}</span></TableCell><TableCell><span className="measurement">{pct(availability(history))}</span></TableCell><TableCell><HealthStrip history={s.history} window={window} now={now} count={30}/></TableCell><TableCell className="text-right last-checked">{elapsed(s.lastChecked, now)}</TableCell></TableRow>; })}{!filtered.length && <TableRow><TableCell colSpan={6}><div className="empty-state"><Search size={24}/><strong>No matching services</strong><p>Try another name, status, or group.</p><Button variant="outline" onClick={() => { setQuery(''); setStatusFilter('all'); setGroupFilter('all'); }}>Clear filters</Button></div></TableCell></TableRow>}</TableBody></Table>
    <div className="table-footer"><span>Showing {filtered.length} of {workspace.services.length} services</span><div className="strip-legend"><span><i className="operational"/>Healthy</span><span><i className="degraded"/>Slow</span><span><i className="down"/>Failed</span><span><i className="unknown"/>No checks</span></div></div>
  </section>;

  return <SidebarProvider style={{ '--sidebar-width': '15rem' }} className="netpulse-app"><a href="#main-content" className="skip-link">Skip to dashboard</a><Toaster position="bottom-right" richColors/>
    <Sidebar className="app-sidebar"><SidebarHeader className="brand-header"><div className="brand"><span className="brand-mark"><Activity size={23}/></span><span>NetPulse</span></div><div className="workspace-chip"><span className="workspace-icon"><Network size={15}/></span><div><strong>{workspace.mode === 'demo' ? 'Demo workspace' : 'HTTP workspace'}</strong><small>{workspace.services.length} monitored services</small></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup className="nav-group"><SidebarGroupLabel>MONITORING</SidebarGroupLabel><SidebarMenu>{NAV.map(item => <NavButton key={item.id} item={item} view={view} onNavigate={setView} badge={item.id === 'incidents' ? activeIncidents.length : 0}/>)}</SidebarMenu></SidebarGroup><div className="sidebar-note"><Radio size={18}/><strong>{workspace.mode === 'demo' ? 'Explore with demo data' : 'Measure real endpoints'}</strong><p>{workspace.mode === 'demo' ? 'A sample network with healthy, slow, and failed services.' : 'HTTP checks run from the server while this dashboard is open.'}</p><button onClick={() => setHelpOpen(true)}>How monitoring works</button></div></SidebarContent>
      <SidebarFooter className="app-sidebar-footer"><Button variant="ghost" className="help-button" onClick={() => setHelpOpen(true)}><CircleHelp size={18}/>Help & project guide</Button><div className="workspace-person"><span>NP</span><div><strong>NetPulse workspace</strong><small>Monitoring console</small></div></div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="app-main"><header className="topbar"><div className="breadcrumb"><SidebarTrigger className="mobile-trigger"/><span>Workspace</span><ChevronRight size={14}/><strong>{NAV.find(n => n.id === view).label}</strong></div><div className="topbar-right"><FilterSelect value={workspace.mode} onChange={changeMode} label="Monitoring data mode" options={[[ 'demo', 'Demo data' ], ['live', 'Live HTTP' ]]}/><div className="auto-control"><Switch id="auto-refresh" checked={auto} onCheckedChange={setAuto} disabled={!loaded}/><label htmlFor="auto-refresh">Auto · 30s</label></div><Button className="refresh-button" variant="ghost" aria-label="Run service checks" onClick={() => runChecks()} disabled={busy || !loaded}><RefreshCw size={18} className={busy ? 'spin' : ''}/></Button></div></header>
      <div id="main-content" className="main-content" tabIndex={-1}><div className="page-heading"><div><div className="eyebrow">NETWORK MONITORING</div><h1>{view === 'overview' ? 'Network overview' : view === 'services' ? 'Your services' : view === 'incidents' ? 'Incident center' : 'Monitoring reports'}</h1><p>{view === 'overview' ? 'Your network health, at a glance.' : view === 'services' ? 'Keep track of every endpoint in your workspace.' : view === 'incidents' ? 'Investigate issues and track service recovery.' : 'Review check results and export your service report.'}</p></div><div className="heading-actions"><Button variant="outline" className="secondary-button" onClick={exportCsv}><Download size={16}/>Export report</Button><Button className="primary-button" onClick={() => runChecks()} disabled={busy || !loaded}><RefreshCw size={16} className={busy ? 'spin' : ''}/>{busy ? 'Checking…' : 'Run checks'}</Button></div></div>
        <div className={`mode-banner ${workspace.mode}`}><span><Radio size={15}/>{workspace.mode === 'demo' ? 'Demo data' : 'Live HTTP checks'}</span><p>{workspace.mode === 'demo' ? 'Simulated endpoints and measurements for learning.' : 'Measurements are collected from configured public HTTPS endpoints.'}</p><button onClick={() => setHelpOpen(true)}>Details</button></div>
        {error && <div className="error-banner" role="alert"><TriangleAlert size={18}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {(view === 'overview' || view === 'reports') && <><div className="section-toolbar"><div className="update-label"><Clock3 size={14}/>Last run {time(workspace.updatedAt)} UTC</div><FilterSelect value={window} onChange={setWindow} label="Report time range" options={[[ '1h', 'Last hour' ], ['6h', 'Last 6 hours' ], ['24h', 'Last 24 hours' ]]}/></div><div className="metric-grid"><article className="metric-card"><div className="metric-label">Monitored services <span className="metric-icon purple"><Server size={17}/></span></div><div className="metric-number">{metrics.total}<span className="inline-health">{metrics.healthy} healthy</span></div><p>{metrics.degraded} degraded · {metrics.down} down</p></article><article className="metric-card"><div className="metric-label">Check availability <span className="metric-icon green"><ShieldCheck size={17}/></span></div><div className="metric-number">{metrics.availability === null ? '—' : metrics.availability.toFixed(2)}<span className="metric-unit">{metrics.availability !== null && '%'}</span></div><p>{metrics.checks} measured checks · {window}</p></article><article className="metric-card"><div className="metric-label">Avg. response time <span className="metric-icon blue"><Gauge size={17}/></span></div><div className="metric-number">{metrics.latency ?? '—'}<span className="metric-unit">{metrics.latency !== null && 'ms'}</span></div><p>Successful HTTP checks · {window}</p></article><article className="metric-card"><div className="metric-label">Active incidents <span className="metric-icon orange"><TriangleAlert size={17}/></span></div><div className="metric-number">{activeIncidents.length}<span className="incident-tag">{activeIncidents.filter(i => i.severity === 'critical').length} critical</span></div><p>{activeIncidents.filter(i => i.status === 'acknowledged').length} acknowledged</p></article></div></>}
        {view === 'overview' && <><div className="chart-grid"><section className="panel latency-panel"><div className="panel-heading"><div><h2>Response time</h2><p>Average latency across monitored services</p></div><span className="subtle-chip">{window}</span></div><LatencyChart services={workspace.services} window={window} now={now}/></section><section className="panel health-panel"><div className="panel-heading"><div><h2>Service health</h2><p>Latest check status</p></div><Activity size={18} className="muted"/></div><div className="health-summary"><div className="health-ring" style={{ '--healthy': `${metrics.total ? metrics.healthy / metrics.total * 100 : 0}%`, '--degraded-stop': `${metrics.total ? (metrics.healthy + metrics.degraded) / metrics.total * 100 : 0}%`, '--down-stop': `${metrics.total ? (metrics.healthy + metrics.degraded + metrics.down) / metrics.total * 100 : 0}%` }}><div><strong>{metrics.healthy}<span>/{metrics.total}</span></strong><small>operational</small></div></div><div className="health-counts">{[['operational', 'Operational', metrics.healthy], ['degraded', 'Degraded', metrics.degraded], ['down', 'Down', metrics.down], ['unknown', 'Paused / unchecked', metrics.total - metrics.healthy - metrics.degraded - metrics.down]].map(([s, label, count]) => <div key={s}><span><i className={s}/>{label}</span><strong>{count}</strong></div>)}</div></div><button className="health-footer" onClick={() => setView('incidents')}>{activeIncidents.length ? <><TriangleAlert size={15}/>{activeIncidents.length} incidents need attention</> : <><CircleCheck size={15}/>No active incidents</>}</button></section></div>{serviceTable}<section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent incidents</h2><p>Latest events in this workspace</p></div><button className="text-button" onClick={() => setView('incidents')}>View all incidents</button></div><div className="recent-list">{workspace.incidents.slice(0, 3).map(i => <button key={i.id} onClick={() => { setView('incidents'); setIncidentFilter('all'); }}><span className={`incident-symbol ${i.severity}`}><TriangleAlert size={17}/></span><span><strong>{i.title}</strong><small>{i.status === 'acknowledged' ? 'Acknowledged' : i.status === 'resolved' ? 'Resolved' : 'Investigating'} · {elapsed(i.openedAt, now)}</small></span><span className={`incident-status ${i.status}`}>{i.status}</span></button>)}{!workspace.incidents.length && <p className="small-empty">No incidents recorded. Failed or slow checks will appear here.</p>}</div></section></>}
        {view === 'services' && <><div className="section-toolbar"><p className="muted">Select a service to inspect its check history.</p><FilterSelect value={window} onChange={setWindow} label="Service history range" options={[[ '1h', 'Last hour' ], ['6h', 'Last 6 hours' ], ['24h', 'Last 24 hours' ]]}/></div>{serviceTable}</>}
        {view === 'incidents' && <section className="panel incident-panel"><div className="panel-heading"><div><h2>Incident log <span className="count-badge">{workspace.incidents.length}</span></h2><p>Incidents close automatically when a service recovers.</p></div></div><Tabs value={incidentFilter} onValueChange={setIncidentFilter} className="incident-tabs"><TabsList aria-label="Incident status"><TabsTrigger value="active">Active ({activeIncidents.length})</TabsTrigger><TabsTrigger value="acknowledged">Acknowledged</TabsTrigger><TabsTrigger value="resolved">Resolved</TabsTrigger><TabsTrigger value="all">All incidents</TabsTrigger></TabsList>{['active', 'acknowledged', 'resolved', 'all'].map(filter => <TabsContent key={filter} value={filter}><div className="incident-cards">{visibleIncidents.map(i => <article key={i.id} className="incident-card"><div className="incident-card-top"><span className={`incident-symbol ${i.severity}`}>{i.status === 'resolved' ? <Check size={19}/> : <TriangleAlert size={19}/>}</span><div><small>{i.id.length > 18 ? 'Automatic incident' : i.id} · <span className={`severity-label ${i.severity}`}>{i.severity}</span></small><h3>{i.title}</h3></div><span className={`incident-status ${i.status}`}>{i.status}</span></div><p className="incident-notes">{i.notes}</p><div className="incident-card-bottom"><span>Opened {new Date(i.openedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC{i.closedAt && ` · Closed ${time(i.closedAt)} UTC`}</span><div><button className="text-button" onClick={() => setSelectedId(i.serviceId)}>View service</button>{i.status === 'open' && <Button variant="outline" onClick={() => acknowledge(i.id)}>Acknowledge</Button>}</div></div></article>)}{!visibleIncidents.length && <div className="empty-state"><CircleCheck size={30}/><strong>No {filter === 'all' ? '' : filter} incidents</strong><p>Service check events will be recorded here.</p></div>}</div></TabsContent>)}</Tabs></section>}
        {view === 'reports' && <><section className="panel report-panel"><div className="panel-heading"><div><h2>Service report</h2><p>{window} · {workspace.mode === 'demo' ? 'Simulated measurements' : 'Measured HTTP checks'}</p></div><Button className="primary-button" onClick={exportCsv}><Download size={16}/>Download CSV</Button></div><div className="report-body"><div><FileChartColumn size={34}/><h3>Your network, in one report.</h3><p>Export service names, endpoints, current status, latest latency, check availability, sample counts, and last check timestamps.</p></div><dl><div><dt>Reporting period</dt><dd>{new Date(now - ({'1h':3600000,'6h':21600000,'24h':86400000}[window])).toLocaleString('en-GB', { timeZone: 'UTC' })} — {new Date(now).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</dd></div><div><dt>Data source</dt><dd>{workspace.mode === 'demo' ? 'Demo simulation' : 'Server HTTP probes'}</dd></div><div><dt>Check availability</dt><dd>Successful checks ÷ measured checks × 100</dd></div><div><dt>Collection scope</dt><dd>Measurements saved in this browser; checks run while the dashboard is open and visible.</dd></div></dl></div></section><section className="panel latency-panel"><div className="panel-heading"><div><h2>Response time trend</h2><p>Successful checks in the selected reporting window</p></div></div><LatencyChart services={workspace.services} window={window} now={now}/></section></>}
        <footer className="content-footer"><span><Activity size={14}/>NetPulse</span><span>{workspace.mode === 'demo' ? 'Demo simulation' : 'HTTP monitoring'} · Browser-local history · UTC timestamps</span></footer>
      </div>
    </SidebarInset>
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="add-dialog"><DialogHeader><DialogTitle>Add a demo service</DialogTitle><DialogDescription>The endpoint is a label for a simulated service. Live targets are configured on the server.</DialogDescription></DialogHeader><form onSubmit={addService} className="service-form"><label>Service name<Input required minLength={2} maxLength={60} placeholder="e.g. Inventory API" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/></label><label>HTTPS endpoint<Input required type="url" placeholder="https://inventory.example.com/health" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}/></label><label>Latency threshold (ms)<Input required type="number" min="50" max="10000" value={form.thresholdMs} onChange={e => setForm(f => ({ ...f, thresholdMs: e.target.value }))}/></label><label>Group<FilterSelect value={form.group} onChange={v => setForm(f => ({ ...f, group: v }))} label="New service group" options={[['Core services','Core services'],['Infrastructure','Infrastructure'],['Background jobs','Background jobs']]}/></label>{formError && <p role="alert" className="form-error">{formError}</p>}<div className="form-actions"><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" className="primary-button"><Plus size={16}/>Add service</Button></div></form></DialogContent></Dialog>
    <Sheet open={!!selectedId} onOpenChange={open => { if (!open) setSelectedId(null); }}><SheetContent className="service-sheet">{selected && <><SheetHeader><span className="eyebrow">SERVICE DETAILS</span><SheetTitle>{selected.name}</SheetTitle><SheetDescription>{selected.url}</SheetDescription></SheetHeader><div className="sheet-body"><div className="service-sheet-status"><Status service={selected}/><Button variant="outline" onClick={() => toggleService(selected.id)}>{selected.enabled ? <Pause size={15}/> : <Play size={15}/>} {selected.enabled ? 'Pause checks' : 'Resume checks'}</Button></div><div className="detail-metrics"><div><span>Response time</span><strong>{ms(selected.latencyMs)}</strong></div><div><span>Check availability</span><strong>{pct(availability(inWindow(selected.history, window, now)))}</strong></div></div><dl className="service-detail-list"><div><dt>Group</dt><dd>{selected.group}</dd></div><div><dt>Location</dt><dd>{selected.region}</dd></div><div><dt>Latency threshold</dt><dd>{selected.thresholdMs} ms</dd></div><div><dt>Last checked</dt><dd>{time(selected.lastChecked)} UTC</dd></div><div><dt>Latest HTTP status</dt><dd>{selected.history.at(-1)?.httpStatus ?? 'No response'}</dd></div></dl>{selected.error && <p className="form-error">{selected.error}</p>}<h3>Check history · {window}</h3><HealthStrip history={selected.history} window={window} now={now} labelled/><LatencyChart services={[selected]} window={window} now={now} compact/><h3>Latest checks</h3><Table className="check-table"><TableHeader><TableRow><TableHead>Time (UTC)</TableHead><TableHead>Result</TableHead><TableHead>Latency</TableHead></TableRow></TableHeader><TableBody>{selected.history.slice(-10).reverse().map((h, i) => <TableRow key={`${h.at}-${i}`}><TableCell>{time(h.at)}</TableCell><TableCell><span className={`check-result ${h.status}`}>{STATUS_LABELS[h.status]}</span></TableCell><TableCell>{ms(h.latencyMs)}</TableCell></TableRow>)}{!selected.history.length && <TableRow><TableCell colSpan={3}>Run a check to collect the first sample.</TableCell></TableRow>}</TableBody></Table></div></>}</SheetContent></Sheet>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="help-dialog"><DialogHeader><DialogTitle>How NetPulse works</DialogTitle><DialogDescription>A practical monitoring workspace for learning and portfolio demos.</DialogDescription></DialogHeader><div className="help-content"><h3>Demo and live data</h3><p>Demo mode simulates eight services. Live HTTP mode checks the public HTTPS targets configured on the server. Add demo services to practice without sending network requests.</p><h3>Health and availability</h3><p>A 2xx response is successful. A response slower than the service threshold is degraded; a failure or timeout is down. Availability is the percentage of successful measured checks, including slow responses.</p><h3>Check collection</h3><p>Run checks manually or turn on 30-second auto refresh. Automatic checks run while this page is open and visible. History and acknowledgements stay in this browser. This project does not run background checks after the page closes.</p><h3>Live target configuration</h3><p>Edit the server target configuration or set <code>NETPULSE_TARGETS_JSON</code> to approved HTTPS endpoints. The browser can request only those configured target IDs. Live checks use a 5-second timeout and do not follow redirects.</p><h3>Incidents and reports</h3><p>Failed and slow services open incidents automatically. Acknowledge an incident during investigation; a successful recovery check closes it. CSV exports reflect the selected period and contain no measurements for unobserved intervals.</p></div></DialogContent></Dialog>
  </SidebarProvider>;
}

import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BellRing, CalendarDays, Download, Droplets, Expand, Gauge, Globe2, Layers3, MapPin,
  Menu, MoreHorizontal, Navigation, RefreshCw, Satellite, Search, ShieldCheck, X, Camera
} from 'lucide-react';
import { alerts, chartValues, navigation, regions, sources, hierarchyData } from './constants';
import { chartPoints } from './utils/helpers';
import AnimatedWatershedBackground from './components/AnimatedWatershedBackground';

import IndiaWatershedMap from './components/IndiaWatershedMap';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImageUpload from './components/ImageUpload';
import DataStatusBadge from './components/DataStatusBadge';

export default function App() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layers, setLayers] = useState({ states: true, districts: false, basin: false, subbasin: false, watershed: true, micro: false, villages: true, rivers: true, drainage: true, waterBodies: true, wells: false, interventions: true, fieldImages: true, critical: false });
  const [sensitivity, setSensitivity] = useState(72);
  const [range, setRange] = useState('Last 7 Days');
  const [period, setPeriod] = useState(7);
  const [alertFilter, setAlertFilter] = useState('All');
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projectStats, setProjectStats] = useState(null);
  
  const [availableStates, setAvailableStates] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  
  const [dataStatus, setDataStatus] = useState({ admin: 'demo', dolr: 'demo' });
  const [dataError, setDataError] = useState({ admin: null, dolr: null });
  const [mapReset, setMapReset] = useState({ count: 0, recentEvidence: null });
  const [evidenceStats, setEvidenceStats] = useState({ total: 0, geocoded: 0 });
  
  React.useEffect(() => {
    fetch('/api/evidence').then(r => r.json()).then(data => {
      setEvidenceStats({ total: data.total || 0, geocoded: data.features?.length || 0 });
    }).catch(console.error);
  }, [mapReset.count]);

  const [fieldEvidence, setFieldEvidence] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('27 Sep 2026, 10:42 IST');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState('Demo GIS layers ready · prototype monitoring environment');
  const [dataMode, setDataMode] = useState('official');

  React.useEffect(() => {
    setDataError(prev => ({ ...prev, admin: null }));
    fetch(`/api/states?mode=${dataMode}`)
      .then(async r => {
        if (!r.ok) {
           let errDetail = 'Official source unavailable';
           try { const err = await r.json(); errDetail = err.detail || errDetail; } catch(e) {}
           throw new Error(errDetail);
        }
        return r.json();
      })
      .then(res => {
        setDataStatus(prev => ({ ...prev, admin: res.dataSource || dataMode }));
        setAvailableStates(res.data || []);
      })
      .catch((err) => {
        setAvailableStates([]);
        setDataStatus(prev => ({ ...prev, admin: 'unavailable' }));
        setDataError(prev => ({ ...prev, admin: err.message }));
      });
  }, [dataMode, isRefreshing]); // Re-fetch on refresh

  React.useEffect(() => {
    if (!selectedState) {
      setAvailableDistricts([]);
      return;
    }
    setDataError(prev => ({ ...prev, admin: null }));
    fetch(`/api/states/${selectedState}/districts?mode=${dataMode}`)
      .then(async r => {
        if (!r.ok) {
           let errDetail = 'Official source unavailable';
           try { const err = await r.json(); errDetail = err.detail || errDetail; } catch(e) {}
           throw new Error(errDetail);
        }
        return r.json();
      })
      .then(res => {
        setDataStatus(prev => ({ ...prev, admin: res.dataSource || dataMode }));
        setAvailableDistricts(res.data || []);
      })
      .catch((err) => {
        setAvailableDistricts([]);
        setDataStatus(prev => ({ ...prev, admin: 'unavailable' }));
        setDataError(prev => ({ ...prev, admin: err.message }));
      });
  }, [selectedState, dataMode, isRefreshing]);

  React.useEffect(() => {
    if (!selectedDistrict) {
      setAvailableProjects([]);
      return;
    }
    setDataError(prev => ({ ...prev, dolr: null }));
    fetch(`/api/projects?district=${selectedDistrict}`)
      .then(async r => {
        if (!r.ok) {
           let errDetail = 'Official source unavailable';
           try { const err = await r.json(); errDetail = err.detail || errDetail; } catch(e) {}
           throw new Error(errDetail);
        }
        return r.json();
      })
      .then(res => {
        setDataStatus(prev => ({ ...prev, dolr: res.dataSource || dataMode }));
        setAvailableProjects(res.projects || res.data || []);
      })
      .catch((err) => {
        setAvailableProjects([]);
        setDataStatus(prev => ({ ...prev, dolr: 'unavailable' }));
        setDataError(prev => ({ ...prev, dolr: err.message }));
      });
  }, [selectedDistrict, dataMode, isRefreshing]);
  
  const visibleAlerts = useMemo(() => alerts.filter((alert) => alertFilter === 'All' || alert.severity === alertFilter), [alertFilter]);

  const [projectPhotosData, setProjectPhotosData] = useState(null);

  React.useEffect(() => {
    let active = true;
    if (selectedProject) {
      setProjectStats({ features: 0, photos: 0, locationsWithPhotos: 0 });
      setProjectPhotosData(null);
      
      fetch(`/api/projects/geotagged?project_id=${selectedProject}`)
        .then(r => r.json())
        .then(res => {
          if (active) setProjectStats(prev => ({ ...prev, features: res.total_spatial_records }));
        })
        .catch(() => {});
        
      fetch(`/api/projects/${selectedProject}/photos`)
        .then(r => r.json())
        .then(res => {
          if (active) {
            setProjectStats(prev => ({ ...prev, photos: res.total_photos, locationsWithPhotos: res.total_locations }));
            setProjectPhotosData(res.photos || []);
          }
        })
        .catch(() => {});
    } else {
      setProjectStats(null);
      setProjectPhotosData(null);
    }
    return () => { active = false; };
  }, [selectedProject]);

  const selectedName = selectedProject ? availableProjects.find(w => w.id == selectedProject)?.name || 'Selected Project' : 'India';
  const selectedAlert = alerts.find((alert) => alert.region === selectedName) || { confidence: 'Demo', location: selectedProject ? 'Prototype project' : 'India' };
  
  const flash = (message) => setNotice(message);
  
  function refreshSystem() { 
    setIsRefreshing(true); 
    window.setTimeout(() => { 
      setLastUpdated(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())); 
      setIsRefreshing(false); 
      flash('Prototype layers refreshed · no official live source connected'); 
    }, 750); 
  }
  
  function viewRegion(region) { 
    // Stub for viewing region
    document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    flash(`Map focused on ${region} · prototype data`); 
  }
  
  function exportCsv() { 
    const file = new Blob([['Region,Water Area,Trend,Alerts', ...regions.map((region) => `${region.name},${region.water},${region.trend},${region.alerts}`)].join('\n')], { type: 'text/csv' }); 
    const url = URL.createObjectURL(file); 
    const anchor = document.createElement('a'); 
    anchor.href = url; 
    anchor.download = 'watersight-regional-monitoring.csv'; 
    anchor.click(); 
    URL.revokeObjectURL(url); 
    flash('Monitoring snapshot exported as CSV'); 
  }
  
  const points = chartPoints(chartValues[period]);

  return <div className="app-shell">
    <AnimatedWatershedBackground variant="dashboard" />
    
    <header className="site-header"><div className="header-inner"><a className="brand" href="#overview" aria-label="WaterSight home"><span className="brand-logo-frame"><img className="brand-logo-image" src="/watersight-logo.png" alt="WaterSight" /></span><span><strong>WaterSight</strong><small>Geospatial Intelligence for Watershed Development</small></span></a><nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation">{navigation.map((item) => <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} onClick={() => setMenuOpen(false)}>{item}</a>)}</nav><div className="header-actions">
          {window.CURRENT_USER ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px', fontSize: '13px' }}>
              <a href="/profile" style={{ color: '#102c3b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                {window.CURRENT_USER.avatar ? (
                  <img src={window.CURRENT_USER.avatar} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ background: '#eef7f2', color: '#168a4c', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {window.CURRENT_USER.name ? window.CURRENT_USER.name[0].toUpperCase() : 'U'}
                  </span>
                )}
                <span>{window.CURRENT_USER.name}</span>
              </a>
              <a href="/logout" style={{ color: '#687d72', textDecoration: 'none', fontWeight: '500' }}>Logout</a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px', fontSize: '13px' }}>
              <a href="/login" style={{ color: '#102c3b', textDecoration: 'none', fontWeight: '500' }}>Login</a>
              <a href="/register" style={{ color: '#168a4c', textDecoration: 'none', fontWeight: '500' }}>Register</a>
            </div>
          )}
<button className="system-button" type="button" onClick={refreshSystem}><span className="live-dot" />{isRefreshing ? 'Refreshing data...' : 'Refresh Data'}</button><button className="icon-button mobile-menu" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" title="Toggle navigation">{menuOpen ? <X size={19} /> : <Menu size={20} />}</button></div></div></header>
    <main>
      <section className="overview-section content-width" id="overview"><div className="intro-row"><div><div className="eyebrow"><span /> WATERSHED INTELLIGENCE</div><h1>See the Watershed. Understand the Change.</h1><p className="intro-copy">A platform combining geo-coded field evidence, satellite observations and GIS layers for Indian watershed development monitoring.</p></div><div className="intro-actions"><button className="button button-secondary" type="button" onClick={() => setShowUploadModal(true)}><Camera size={16} /> Upload Evidence</button><button className="button button-secondary" type="button" onClick={exportCsv}><Download size={16} /> Export data</button><button className="button button-primary" type="button" onClick={refreshSystem}><RefreshCw size={16} className={isRefreshing ? 'spin' : ''} /> Refresh Data</button></div></div>
      <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
        <DataStatusBadge status={dataStatus.admin} sourceName="Administrative Geography" error={dataError.admin} />
        <DataStatusBadge status={dataStatus.dolr} sourceName="DoLR WDC-PMKSY" error={dataError.dolr} />
        <DataStatusBadge status="official" sourceName="Bhuvan / NRSC" error={null} />
      </div>
      <div className="metrics-grid"><article className="metric-card"><div className="metric-icon blue"><Droplets size={22} /></div><div><span>Watershed area</span><strong>48.6 km²</strong><small className="up">12 <em>water bodies</em></small></div><Activity className="metric-spark" size={48} /></article><article className="metric-card"><div className="metric-icon red"><AlertTriangle size={22} /></div><div><span>Watershed interventions</span><strong>18</strong><small className="up">11 <em>completed</em></small></div><BellRing className="metric-spark red-stroke" size={45} /></article><article className="metric-card"><div className="metric-icon teal"><MapPin size={22} /></div><div><span>Geo-coded images</span><strong>24</strong><small className="neutral">6 <em>villages</em></small></div><Globe2 className="metric-spark" size={48} /></article></div></section>
      <section className="map-section" id="map"><div className="content-width"><div className="section-heading map-heading"><div><div className="eyebrow"><span /> INDIA WATERSHED EXPLORER</div><h2>India-focused watershed GIS</h2><p>Select a watershed to inspect its local evidence, drainage and interventions.</p></div><div className="map-update"><span className="live-dot" /> {notice}</div></div><div className="watershed-selectors">
        <label>Country<select value="India" disabled><option>India</option></select></label>
        <label>State<select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setSelectedDistrict(''); setSelectedProject(''); setMapReset((value) => value + 1); }}>
          <option value="">Select State</option>
          {availableStates.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}
        </select></label>
        <label>District<select value={selectedDistrict} disabled={!selectedState} onChange={(event) => { setSelectedDistrict(event.target.value); setSelectedProject(''); }}>
          <option value="">Select District</option>
          {availableDistricts.map(dist => <option key={dist.id} value={dist.id}>{dist.name}</option>)}
        </select></label>
        <label>WDC-PMKSY Project<select value={selectedProject} disabled={!selectedDistrict} onChange={(event) => { setSelectedProject(event.target.value); flash(event.target.value ? 'Project selected' : 'India overview restored'); }}>
          <option value="">Select Project</option>
          {availableProjects.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>
        {selectedDistrict && availableProjects.length === 0 && (
          <span style={{ fontSize: '11px', color: '#d94343', display: 'block', marginTop: '4px' }}>
            No WDC-PMKSY project is currently associated with this district.
          </span>
        )}
        </label>
        <div style={{ fontSize: '12px', color: '#687d72', marginTop: '10px' }}>
          <strong>Hydrological Watershed:</strong> Click on a watershed polygon directly on the map to view its details.
        </div>
      </div><div className="map-stage india-map-stage"><IndiaWatershedMap layers={layers} stateId={selectedState} districtId={selectedDistrict} projectId={selectedProject} resetView={mapReset} onFieldEvidence={setFieldEvidence} /><div className="map-topbar"><span><Globe2 size={14} /> India · OpenStreetMap base layer</span><span><Satellite size={14} /> GIS data</span></div><div className="layer-panel india-layer-panel"><div className="panel-label"><Layers3 size={15} /> GIS layers</div>{[['states', 'State boundaries'], ['districts', 'District boundaries'], ['basin', 'Basin (Bhuvan)'], ['subbasin', 'Subbasin (Bhuvan)'], ['watershed', 'Watershed (Bhuvan)'], ['micro', 'Micro-watershed (Bhuvan)'], ['villages', 'Villages'], ['rivers', 'Rivers / streams'], ['drainage', 'Drainage'], ['waterBodies', 'Water bodies'], ['wells', 'Wells'], ['interventions', 'Interventions'], ['fieldImages', 'Geo-coded images'], ['critical', 'Critical zones']].map(([key, label]) => <button key={key} className="layer-row" type="button" onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))} role="switch" aria-checked={layers[key]}><span>{label}</span><i className={layers[key] ? 'toggle active' : 'toggle'}><b /></i></button>)}</div>{fieldEvidence && <aside className="field-evidence-panel"><button type="button" onClick={() => setFieldEvidence(null)} aria-label="Close field evidence"><X size={14} /></button><span>FIELD EVIDENCE</span><strong>{fieldEvidence.properties.category}</strong><p>{fieldEvidence.properties.description}</p><small>Image preview unavailable · {fieldEvidence.properties.date} · {fieldEvidence.geometry.coordinates[1].toFixed(5)}, {fieldEvidence.geometry.coordinates[0].toFixed(5)}</small></aside>}<div className="india-map-legend"><span><i className="legend-watershed" /> Watershed</span><span><i className="legend-water" /> Water body</span><span><i className="legend-intervention" /> Intervention</span><span><i className="legend-evidence" /> Field evidence</span></div></div><div className="map-summary"><div><span>Selected</span><strong>{selectedName}</strong><small><MapPin size={13} /> {selectedAlert.location}</small></div><div><span>Area</span><strong className="blue-text">{selectedProject ? '48.6 km²' : 'Select one'}</strong><small>geometry</small></div><div><span>Interventions</span><strong>{selectedProject ? '18' : '—'}</strong><small>records</small></div><div><span>Field evidence</span><strong>{evidenceStats ? evidenceStats.geocoded : '—'}</strong><small>geo-coded (of {evidenceStats ? evidenceStats.total : 0} total)</small></div></div>
{selectedProject && projectStats && projectStats.features === 0 && (
  <div style={{ padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '12px', marginTop: '10px', border: '1px solid #ffeeba' }}>
    Official WDC-PMKSY project found, but no verified geotagged locations are currently available.
  </div>
)}
</div></section>
      <section className="content-width intelligence-section" id="alerts"><div className="alerts-layout"><div className="alerts-column"><div className="section-heading compact"><div><div className="eyebrow"><span /> WATERSHED ATTENTION SIGNALS · DEMO DATA</div><h2>Prototype attention signals</h2></div><button className="icon-button" type="button" title="Alert settings" aria-label="Alert settings"><MoreHorizontal size={19} /></button></div><div className="filter-group">{['All', 'High', 'Medium', 'Low'].map((filter) => <button key={filter} type="button" onClick={() => setAlertFilter(filter)} className={alertFilter === filter ? 'filter active' : 'filter'}>{filter}{filter === 'All' ? ` (${alerts.length})` : ''}</button>)}</div><div className="alert-list">{visibleAlerts.map((alert) => <article className="alert-card" key={alert.id}><div className={`severity-bar ${alert.severity.toLowerCase()}`} /><div className="alert-content"><div className="alert-meta"><span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span><time>{alert.time}</time></div><h3>{alert.title}</h3><p>{alert.description}</p><div className="alert-footer"><span><MapPin size={14} /> {alert.location}</span><strong>Analysis: {alert.confidence}</strong></div></div><button className="icon-button alert-go" type="button" onClick={() => viewRegion(alert.region)} title="View on map" aria-label={`View ${alert.region} on map`}><Navigation size={17} /></button></article>)}</div></div><aside className="trend-panel" id="history"><div className="trend-top"><div><span className="card-kicker">PROTOTYPE WATERSHED INDICATOR</span><h3>Water-area trend</h3></div><button className="icon-button" type="button" title="Expand chart" aria-label="Expand chart"><Expand size={17} /></button></div><div className="trend-value"><strong>+3.2%</strong><span>demo water area variation<br />against baseline</span></div><div className="period-tabs">{[7, 30, 90].map((value) => <button key={value} type="button" className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{value}D</button>)}</div><div className="chart-wrap"><div className="chart-grid"><span>70</span><span>50</span><span>30</span><span>10</span></div><svg viewBox="0 0 300 112" aria-label="Prototype water area trend chart" role="img"><polyline className="chart-shadow" points={points} /><polyline className="chart-line" points={points} /><circle cx={points.split(' ').at(-1).split(',')[0]} cy={points.split(' ').at(-1).split(',')[1]} r="4" className="chart-point" /></svg></div><div className="chart-labels"><span>{period === 7 ? 'Reference' : `${period} days ago`}</span><span>Demo snapshot</span></div><div className="trend-insight"><Gauge size={17} /><span><strong>Prototype indicator only</strong> · field verification remains essential</span></div></aside></div></section>
      <section className="regions-section"><div className="content-width"><div className="section-heading"><div><div className="eyebrow"><span /> PRIORITY COVERAGE</div><h2>Regional monitoring</h2><p>Focused observation areas with the most recent water conditions.</p></div><button className="button button-secondary" type="button" onClick={() => flash('All 24 monitored regions are in view')}><Globe2 size={16} /> View all regions</button></div><div className="region-grid">{regions.map((region) => <article className="region-card" key={region.name}><div className={`mini-map ${region.map}`}><span className="mini-river" /><span className="mini-water" /><span className="mini-marker" /></div><div className="region-card-body"><div className="region-title"><div><h3>{region.name}</h3><p>{region.country}</p></div>{region.alerts > 0 && <span className="region-alert"><AlertTriangle size={13} /> {region.alerts}</span>}</div><div className="region-stats"><div><span>Water area</span><strong>{region.water}</strong></div><div><span>Trend</span><strong className={region.tone === 'red' ? 'red-text' : 'blue-text'}>{region.delta}</strong></div></div><button className="text-button" type="button" onClick={() => viewRegion(region.name)}>{region.trend} conditions <Navigation size={15} /></button></div></article>)}</div>
{selectedProject && projectStats && projectStats.features === 0 && (
  <div style={{ padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '12px', marginTop: '10px', border: '1px solid #ffeeba' }}>
    Official WDC-PMKSY project found, but no verified geotagged locations are currently available.
  </div>
)}
</div></section>
      <AnalyticsDashboard />
      <section className="content-width data-section" id="data-sources"><div className="section-heading"><div><div className="eyebrow"><span /> INDIA WATERSHED DATA NETWORK</div><h2>Data sources</h2><p>Transparent source status for the Watersight prototype and future official integrations.</p></div><button className="button button-secondary" type="button" onClick={() => flash('Data-source readiness report is available')}><Search size={16} /> View source health</button></div><div className="source-table-wrap"><table className="source-table"><thead><tr><th>Source</th><th>Purpose</th><th>Refresh</th><th>Coverage</th><th>Status</th></tr></thead><tbody>{sources.map(([source, detail, refresh, coverage, status]) => <tr key={source}><td><span className="source-icon"><Satellite size={16} /></span><strong>{source}</strong></td><td>{detail}</td><td>{refresh}</td><td>{coverage}</td><td><span className="source-status"><i /> {status}</span></td></tr>)}</tbody></table></div></section>
      
      {showUploadModal && (
        <ImageUpload 
          onCancel={() => setShowUploadModal(false)}
          onUpload={({ file, data }) => {
            setShowUploadModal(false);
            flash(`Image uploaded: ${file.name} (Source: ${data.source})`);
            setMapReset(r => ({ count: r.count + 1, recentEvidence: data.evidence })); 
          }}
        />
      )}
    </main>
    <footer className="site-footer"><div className="content-width footer-inner"><div><a className="brand footer-brand" href="#overview"><span className="brand-logo-frame footer-logo-frame"><img className="brand-logo-image" src="/watersight-logo.png" alt="WaterSight" /></span><strong>WaterSight</strong></a><p>Geospatial intelligence for watershed development and evidence-led planning.</p></div><div className="footer-links"><a href="#overview">About</a><a href="#map">Methodology</a><a href="#data-sources">Data policy</a><a href="#data-sources">Integration</a></div><small>Problem Statement 26015 · Ministry of Rural Development · Department of Land Resources. Prototype data only: this application does not claim official SRISHTI or WDC-PMKSY live access.</small></div></footer>
  </div>;
}

import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, BellRing, CalendarDays, Download, Droplets, Expand, Gauge, Globe2, Layers3, MapPin,
  Menu, MoreHorizontal, Navigation, RefreshCw, Satellite, Search, ShieldCheck, X, Camera, Power
} from 'lucide-react';
import { alerts, chartValues, navigation, regions, sources, hierarchyData } from './constants';
import { chartPoints } from './utils/helpers';
import AnimatedWatershedBackground from './components/AnimatedWatershedBackground';

import IndiaWatershedMap from './components/IndiaWatershedMap';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImageUpload from './components/ImageUpload';
import DataStatusBadge from './components/DataStatusBadge';
import WatershedHeroVisual from './components/WatershedHeroVisual';

export default function App() {
  const [realRegions, setRealRegions] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState(window.location.hash || '#overview');
  useEffect(() => {
    const onHashChange = () => setActiveHash(window.location.hash || '#overview');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [layers, setLayers] = useState({ states: true, districts: false, basin: false, subbasin: false, watershed: true, micro: false, villages: true, rivers: true, drainage: true, waterBodies: true, wells: false, interventions: true, fieldImages: true, critical: false });
  const [sensitivity, setSensitivity] = useState(72);
  const [range, setRange] = useState('Last 7 Days');
  const [period, setPeriod] = useState(7);
  const [alertFilter, setAlertFilter] = useState('All');
  const [monitoringSignals, setMonitoringSignals] = useState([]);
    const [alertData, setAlertData] = useState(null);
    const [visibleCount, setVisibleCount] = useState(6);
  const [monitoringSummary, setMonitoringSummary] = useState(null);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [monitoringError, setMonitoringError] = useState(false);
  

  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projectStats, setProjectStats] = useState(null);
  React.useEffect(() => {
    setMonitoringLoading(true);
    setMonitoringError(false);
    let urlSig = `/api/alerts?state=${selectedState || ''}&district=${selectedDistrict || ''}`;
      let urlSum = '/api/monitoring-summary';
      if (selectedProject) {
         urlSum += '?project_id=' + selectedProject;
      }
    Promise.all([
      fetch(urlSig).then(r=>r.json()),
      fetch(urlSum).then(r=>r.json())
    ]).then(([sigRes, sumRes]) => {
      if (sigRes.status === 'success') {
          setMonitoringSignals(sigRes.alerts || []);
          setAlertData(sigRes);
          setVisibleCount(6);
        } else {
          setMonitoringError(true);
        }
      if (sumRes.status === 'success') setMonitoringSummary(sumRes.data);
      else setMonitoringError(true);
      setMonitoringLoading(false);
    }).catch(() => {
      setMonitoringError(true);
      setMonitoringLoading(false);
    });
  }, [selectedProject]);
  
  const [availableStates, setAvailableStates] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  
  const [dataStatus, setDataStatus] = useState({ admin: 'demo', dolr: 'demo' });
  const [dataError, setDataError] = useState({ admin: null, dolr: null });
  const [dataSync, setDataSync] = useState({ admin: null, dolr: null });
  const [mapReset, setMapReset] = useState({ count: 0, recentEvidence: null });
  const [evidenceStats, setEvidenceStats] = useState({ total: 0, geocoded: 0 });
  
  
  const [regionalError, setRegionalError] = useState(false);
  React.useEffect(() => {
    fetch('/api/regional-monitoring')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success' && data.regions && data.regions.length > 0) {
          setRealRegions(data.regions);
        } else {
          setRegionalError(true);
        }
      })
      .catch(() => setRegionalError(true));
  }, []);

  React.useEffect(() => {
    fetch('/api/evidence').then(r => r.json()).then(data => {
      setEvidenceStats({ total: data.total || 0, geocoded: data.features?.length || 0 });
    }).catch(console.error);
  }, [mapReset.count]);

  const [fieldEvidence, setFieldEvidence] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('27 Sep 2026, 10:42 IST');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
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
        setDataStatus(prev => ({ ...prev, admin: res.connection_status || res.source || res.dataSource || dataMode }));
        setDataSync(prev => ({ ...prev, admin: res.last_successful_sync }));
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
        setDataStatus(prev => ({ ...prev, admin: res.connection_status || res.source || res.dataSource || dataMode }));
        setDataSync(prev => ({ ...prev, admin: res.last_successful_sync }));
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
        setDataStatus(prev => ({ ...prev, dolr: res.connection_status || res.dataSource || 'demo' }));
          setDataSync(prev => ({ ...prev, dolr: res.last_successful_sync }));
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
    
    <header className="site-header"><div className="header-inner"><a className="brand" href="#overview" aria-label="WaterSight home"><span className="brand-logo-frame"><img className="brand-logo-image" src="/watersight-logo.png" alt="WaterSight" /></span><span><strong>WaterSight</strong><small>Geospatial Intelligence for Watershed Development</small></span></a><nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation">{navigation.map((item) => {
  const href = `#${item.toLowerCase().replace(' ', '-')}`;
  const isActive = activeHash === href;
  return <a key={item} href={href} className={isActive ? 'active' : ''} onClick={() => { setMenuOpen(false); window.location.hash = href; }}>{item}</a>
})}</nav><div className="header-actions">
          {window.CURRENT_USER ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px', fontSize: '13px' }}>
              <a href="/profile" className="nav-interactive" style={{ color: '#102c3b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px' }}>
                {window.CURRENT_USER.avatar ? (
                  <img src={window.CURRENT_USER.avatar} alt="Profile" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ background: '#eef7f2', color: '#168a4c', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {window.CURRENT_USER.name ? window.CURRENT_USER.name[0].toUpperCase() : 'U'}
                  </span>
                )}
                <span>{window.CURRENT_USER.name}</span>
              </a>
              <a href="/logout" className="logout-power-btn" aria-label="Logout" title="Logout"><Power size={16} strokeWidth={2.5} /><span>Log out</span></a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px', fontSize: '13px' }}>
              <a href="/login" className="nav-interactive auth-btn auth-btn-primary" style={{ textDecoration: 'none' }}>Login</a>
              <a href="/register" className="nav-interactive auth-btn auth-btn-accent" style={{ textDecoration: 'none' }}>Register</a>
            </div>
          )}
<button className="icon-button mobile-menu" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" title="Toggle navigation">{menuOpen ? <X size={19} /> : <Menu size={20} />}</button></div></div></header>
    <main>
      <section className="overview-section content-width" id="overview"><div className="intro-row"><div className="hero-anim-wrapper">  <div className="hero-topo-bg"></div>  <div className="eyebrow"><span></span></div>  <h1>    <span className="hero-scan-line"></span>    See the Watershed. Understand the Change.    <div className="hero-location-pulse"></div>  </h1>  <p className="intro-copy">A platform combining geo-coded field evidence, satellite observations and GIS layers for Indian watershed development monitoring.</p></div><div className="intro-actions"><button className="button button-secondary" type="button" onClick={() => setShowUploadModal(true)}><Camera size={16} /> Upload Evidence</button><button className="button button-secondary" type="button" onClick={exportCsv}><Download size={16} /> Export data</button><button className="button button-primary" type="button" onClick={refreshSystem}><RefreshCw size={16} className={isRefreshing ? 'spin' : ''} /> Refresh Data</button></div></div>
      <WatershedHeroVisual />
      <div className="metrics-grid"><article className="metric-card"><div className="metric-icon blue"><Droplets size={22} /></div><div><span>Watershed area</span><strong>48.6 km²</strong><small className="up">12 <em>water bodies</em></small></div><Activity className="metric-spark" size={48} /></article><article className="metric-card"><div className="metric-icon red"><AlertTriangle size={22} /></div><div><span>Watershed interventions</span><strong>18</strong><small className="up">11 <em>completed</em></small></div><BellRing className="metric-spark red-stroke" size={45} /></article><article className="metric-card"><div className="metric-icon teal"><MapPin size={22} /></div><div><span>Geo-coded images</span><strong>24</strong><small className="neutral">6 <em>villages</em></small></div><Globe2 className="metric-spark" size={48} /></article></div></section>
      <section className="map-section" id="map"><div className="content-width"><div className="section-heading map-heading"><div><div className="eyebrow"><span /> INDIA WATERSHED EXPLORER</div><h2>India-focused watershed GIS</h2><p>Select a watershed to inspect its local evidence, drainage and interventions.</p></div>{notice && <div className="map-update"><span className="live-dot" /> {notice}</div>}</div><div className="watershed-selectors">
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
      <section className="content-width intelligence-section" id="alerts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <aside className="trend-panel" id="history" style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '15px 25px', gap: '20px', flexWrap: 'wrap' }}>
              <div className="trend-top" style={{ flex: '1', minWidth: '200px' }}>
                <div>
                  <span className="card-kicker">OFFICIAL PROJECT MONITORING</span>
                  <h3>{monitoringSummary?.project_name || 'Monitoring Overview'}</h3>
                </div>
              </div>
              {monitoringLoading ? (
                 <div style={{ padding: '20px', textAlign: 'center', color: '#6b7c73' }}>Loading...</div>
              ) : monitoringError ? (
                 <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b5f' }}>Data unavailable.</div>
              ) : monitoringSummary ? (
                <>
                  <div className="trend-value" style={{ flex: '1', minWidth: '150px' }}>
                    <strong>{monitoringSummary.total_geotags}</strong>
                    <span style={{ marginTop: '5px', fontSize: '12px' }}>official implementation<br />records geotagged</span>
                  </div>
                  
                  <div style={{ flex: '2', minWidth: '300px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
                    {monitoringSummary.activities.slice(0,4).map((act, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#88a696', fontWeight: '500', textTransform: 'capitalize', fontSize: '11px' }}>{act.name}</span>
                        <span style={{ color: '#fff', fontWeight: '700' }}>{act.count}</span>
                      </div>
                    ))}
                    {monitoringSummary.activities.length === 0 && <div style={{ fontSize: '12px', color: '#6b7c73' }}>No activities recorded.</div>}
                  </div>
                </>
              ) : null}
            </aside>
            <div className="alerts-column" style={{ width: '100%' }}>
            <div className="section-heading compact">
                <div>
                  <div className="eyebrow"><span /> OFFICIAL DISASTER ALERTS</div>
                  <h2>Early Warning &amp; Risk Alerts</h2>
                </div>
              </div>
              
              {alertData && alertData.summary && (
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', backgroundColor: '#eef7f2', borderRadius: '8px', border: '1px solid #d8e8df', fontSize: '13px' }}>
                  <strong>Active Alerts: {alertData.summary.active}</strong>
                  <span>High Priority: <strong style={{color: '#df4444'}}>{alertData.summary.high_priority}</strong></span>
                  <span>Flash Flood: <strong>{alertData.summary.flash_flood}</strong></span>
                  <span>Heavy Rainfall: <strong>{alertData.summary.heavy_rainfall}</strong></span>
                  <span>Drought/Water Stress: <strong>{alertData.summary.drought}</strong></span>
                  <div style={{ width: '100%', fontSize: '11px', color: '#687d72', marginTop: '5px' }}>
                    {alertData.is_live ? 'Live Data from Source' : 'Last successfully retrieved data shown'}
                  </div>
                </div>
              )}

              <div className="alert-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {monitoringLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7c73' }}>Loading official alerts...</div>
                ) : monitoringError ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#ff6b5f' }}>Official alert source currently unavailable.</div>
                ) : monitoringSignals.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7c73' }}>No active official disaster alerts for the selected area.</div>
                ) : (
                  monitoringSignals.slice(0, visibleCount).map((signal, idx) => (
                    <article className="alert-card" key={signal.id || idx}>
                      <div className="severity-bar info" style={{ backgroundColor: signal.color === 'red' ? '#df4444' : signal.color === 'orange' ? '#f59e0b' : signal.color === 'yellow' ? '#fde047' : '#168a4c' }} />
                      <div className="alert-content">
                        <div className="alert-meta">
                          <span className="badge info" style={{ backgroundColor: '#eef7f2', color: '#168a4c' }}>Source: {signal.source}</span>
                          <time>Issued: {signal.time}</time>
                        </div>
                        <h3 style={{ textTransform: 'capitalize' }}>{signal.severity} - {signal.title}</h3>
                        <p>{signal.description}</p>
                        <div className="alert-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12px' }}><MapPin size={14} /> Affected: {signal.location}</span>
                          {signal.valid_until && <span style={{ fontSize: '12px', color: '#687d72' }}>Valid until: {signal.valid_until}</span>}
                          
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => {
                                if (signal.centroid) {
                                  window.location.hash = 'map';
                                }
                            }} className="button button-primary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12}/> View on Map</button>
                            <a href="https://sachet.ndma.gov.in" target="_blank" className="button button-secondary" style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#eee', color: '#333' }}>View Source</a>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {monitoringSignals && monitoringSignals.length > visibleCount && (
                  <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button onClick={() => setVisibleCount(prev => prev + 6)} className="button button-primary" style={{ padding: '10px 20px', borderRadius: '20px' }}>Load More Alerts ({monitoringSignals.length - visibleCount} remaining)</button>
                  </div>
              )}
            </div>
            
            </div>
      </section>
      <section className="regions-section"><div className="content-width"><div className="section-heading"><div><div className="eyebrow"><span /> PRIORITY COVERAGE</div><h2>Regional monitoring</h2><p>Focused observation areas with the most recent water conditions.</p></div><a href="#map" className="button button-secondary" onClick={() => flash('Navigating to India Watershed Explorer')}><Globe2 size={16} /> View all regions</a></div>{regionalError ? (
  <div style={{ padding: '40px', textAlign: 'center', color: '#ff6b5f', background: '#fff0f0', borderRadius: '8px', border: '1px solid #fad2d2', gridColumn: '1 / -1' }}>
    Official regional project data is temporarily unavailable. <button onClick={() => window.location.reload()} style={{ marginLeft: '10px', padding: '4px 8px', background: '#fff', border: '1px solid #fad2d2', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
  </div>
) : (
<div className="region-grid">
  {realRegions.map((region) => (
    <article className="region-card" key={region.official_id}>
      <div className="mini-map" style={{ backgroundColor: '#e5edf1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6b7c73', fontSize: '11px', padding: '10px', position: 'relative' }}>
        {region.photos && region.photos.length > 0 ? (
          <img 
            src={region.photos[0].url} 
            alt={region.project_name || "Official project"} 
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }} 
          />
        ) : (
          <span style={{ zIndex: 10, position: 'relative' }}>Official photo unavailable</span>
        )}
      </div>
      <div className="region-card-body">
        <div className="region-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '14px', lineHeight: '1.3', marginBottom: '4px' }}>{region.project_name}</h3>
            <p>{region.district}, {region.state}</p>
          </div>
          <span className="region-alert" style={{ background: '#eef7f2', color: '#168a4c', border: '1px solid #d8e8df', marginTop: '6px' }}>
            <ShieldCheck size={13} /> Official WDC-PMKSY
          </span>
        </div>
        
        <div className="region-stats" style={{ marginTop: '15px' }}>
          <div>
            <span>Intervention</span>
            <strong style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', display: 'block' }}>{region.work_name || 'Watershed Work'}</strong>
          </div>
          <div>
            <span>Verified Photos</span>
            <strong className="blue-text">{region.photos?.length || 0}</strong>
          </div>
        </div>
        
        <button className="text-button" type="button" onClick={() => {
          document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          fetch('/api/states?mode=official').then(r=>r.json()).then(res => {
            const state = res.data.find(s => s.name === region.state);
            if (state) {
              setSelectedState(state.id);
              setTimeout(() => {
                fetch(`/api/states/${state.id}/districts?mode=official`).then(r=>r.json()).then(dRes => {
                  const dist = dRes.data.find(d => d.name === region.district);
                  if (dist) {
                    setSelectedDistrict(dist.id);
                    setTimeout(() => setSelectedProject(region.official_id), 500);
                  }
                });
              }, 500);
            }
          });
          flash(`Flying to official project: ${region.project_name}`);
        }}>
          View official project <Navigation size={15} />
        </button>
      </div>
    </article>
  ))}
</div>
)}
{selectedProject && projectStats && projectStats.features === 0 && (
  <div style={{ padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '12px', marginTop: '10px', border: '1px solid #ffeeba' }}>
    Official WDC-PMKSY project found, but no verified geotagged locations are currently available.
  </div>
)}
</div></section>
      <AnalyticsDashboard />
      <section className="content-width data-section" id="data-sources"><div className="section-heading"><div><div className="eyebrow"><span /> INDIA WATERSHED DATA NETWORK</div><h2>Data sources</h2><p>Transparent source status for the Watersight prototype and future official integrations.</p></div><button className="button button-secondary" type="button" onClick={() => flash('Data-source readiness report is available')}><Search size={16} /> View source health</button></div><div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <DataStatusBadge status={dataStatus.admin} sourceName="Administrative Geography" error={dataError.admin} lastSync={dataSync.admin} />
        <DataStatusBadge status={dataStatus.dolr} sourceName="DoLR WDC-PMKSY" error={dataError.dolr} lastSync={dataSync.dolr} />
        <DataStatusBadge status="official" sourceName="Bhuvan / NRSC" error={null} />
      </div>
      <div className="source-table-wrap"><table className="source-table"><thead><tr><th>Source</th><th>Purpose</th><th>Refresh</th><th>Coverage</th><th>Status</th></tr></thead><tbody>{sources.map(([source, detail, refresh, coverage, status]) => <tr key={source}><td><span className="source-icon"><Satellite size={16} /></span><strong>{source}</strong></td><td>{detail}</td><td>{refresh}</td><td>{coverage}</td><td><span className="source-status"><i /> {status}</span></td></tr>)}</tbody></table></div></section>
      
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
    <footer className="site-footer"><div className="content-width footer-inner"><div><a className="brand footer-brand" href="#overview"><span className="brand-logo-frame footer-logo-frame"><img className="brand-logo-image" src="/watersight-logo.png" alt="WaterSight" /></span><strong>WaterSight</strong></a><p>Geospatial intelligence for watershed development and evidence-led planning.</p></div><div className="footer-links"><a href="#overview">About</a><a href="#map">Methodology</a><a href="#data-sources">Data policy</a><a href="#data-sources">Integration</a></div></div></footer>
  </div>;
}


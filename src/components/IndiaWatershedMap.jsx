function UserEvidencePopupContent({ feature }) {
  const p = feature.properties || {};
  return (
    <div style={{ minWidth: '220px', fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#168a4c', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
        FIELD EVIDENCE
      </h3>
      <div style={{ fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
        <div><strong>Category:</strong> {p.category || 'N/A'}</div>
        <div><strong>Description:</strong> {p.description || 'N/A'}</div>
        <div><strong>Date:</strong> {p.uploaded_at ? new Date(p.uploaded_at).toLocaleString() : 'N/A'}</div>
        <div><strong>GPS:</strong> {feature.geometry?.coordinates[1]?.toFixed(5)}, {feature.geometry?.coordinates[0]?.toFixed(5)}</div>
        <div><strong>GPS Source:</strong> {p.gps_source === 'browser_live' ? 'Current Device Location' : (p.gps_source || 'N/A')}</div>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        {p.image_url ? (
          <div style={{ border: '1px solid #ddd', padding: '2px', borderRadius: '4px' }}>
            <a href={p.image_url} target="_blank" rel="noreferrer" title="Click to view full image">
              <img 
                src={p.image_url} 
                alt="Field Evidence" 
                style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', cursor: 'zoom-in' }} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none', fontSize: '12px', color: '#666', fontStyle: 'italic', padding: '10px' }}>
                Uploaded image could not be retrieved.
              </div>
            </a>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            Uploaded image could not be retrieved.
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><strong>Source:</strong> Watersight field evidence</span>
        <a href={`/satellite-analysis?lat=${feature.geometry?.coordinates[1]}&lng=${feature.geometry?.coordinates[0]}&img=${encodeURIComponent(p.image_url || '')}`} target="_blank" className="button button-primary" style={{ padding: '4px 8px', fontSize: '10px', textDecoration: 'none' }}>Analyze Satellite Data</a>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, LayersControl, WMSTileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const geoDatasets = ['field_images'];

function GeotagPopupContent({ feature }) {
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIdx(0);
    fetch(`/api/projects/geotagged/${feature.properties.collection_sno}/photos`)
      .then(r => r.json())
      .then(res => {
        if (active) {
          setPhotoData(res.photos || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoData([]);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [feature]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '300px' }}>
      <div style={{ marginBottom: '10px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#168a4c' }}>OFFICIAL GEOTAG</h4>
        <div style={{ fontSize: '12px', color: '#333' }}>
          <strong>Project:</strong> {feature.properties?.project_name}<br/>
          <strong>State:</strong> {feature.properties?.state_name}<br/>
          <strong>District:</strong> {feature.properties?.district_name}<br/>
          <strong>Work Code:</strong> {feature.properties?.work_code || feature.properties?.work_serial_code}<br/>
          <strong>Activity:</strong> {feature.properties?.activity_description}<br/>
          <strong>Coordinates:</strong> {feature.geometry?.coordinates[1]?.toFixed(5)}, {feature.geometry?.coordinates[0]?.toFixed(5)}
        </div>
      </div>
      
      <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#687d72' }}>FIELD PHOTOGRAPHS</h4>
        {loading ? (
          <div style={{ fontSize: '12px', color: '#666' }}>Loading official photographs...</div>
        ) : photoData && photoData.length > 0 ? (
          <div>
            <div style={{ background: '#f5f5f5', padding: '5px', borderRadius: '4px', textAlign: 'center' }}>
              <img 
                src={photoData[idx].url} 
                alt="Field Work" 
                style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
              />
              <div style={{ display: 'none', fontSize: '12px', color: '#d94343', padding: '20px 0' }}>
                Original image not available on remote server.
              </div>
            </div>
                          {photoData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                  {photoData.length > 1 ? (
                    <button 
                      onClick={() => setIdx(i => i > 0 ? i - 1 : photoData.length - 1)}
                      style={{ background: 'none', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Prev
                    </button>
                  ) : <div style={{width: '42px'}}></div>}
                  <span style={{ fontSize: '12px', color: '#666' }}>{idx < photoData.length ? idx + 1 : 1} / {photoData.length}</span>
                  {photoData.length > 1 ? (
                    <button 
                      onClick={() => setIdx(i => i < photoData.length - 1 ? i + 1 : 0)}
                      style={{ background: 'none', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Next
                    </button>
                  ) : <div style={{width: '42px'}}></div>}
                </div>
              )}
            <div style={{ fontSize: '10px', color: '#888', marginTop: '5px', textAlign: 'right' }}>
              Source: DoLR / NRSC Bhuvan
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#666', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
            Official geotag location available.<br/>
            No official photograph is currently available from the source.
          </div>
        )}
      </div>
    </div>
  );
}

function MapViewport({ resetView, indiaStats, fitBoundsObj }) {
  const map = useMap();
  React.useEffect(() => {
    if (resetView && resetView.recentEvidence && resetView.recentEvidence.latitude && resetView.recentEvidence.longitude) {
      map.flyTo([resetView.recentEvidence.latitude, resetView.recentEvidence.longitude], 17, { animate: true, duration: 1.2 });
      setTimeout(() => {
        map.eachLayer((layer) => {
          if (layer.options && layer.options.isRecentEvidenceMarker) {
             layer.openPopup();
          }
        });
      }, 1500);
    } else if (fitBoundsObj) {
      if (fitBoundsObj.point) {
        map.flyTo(fitBoundsObj.point, 15, { animate: true, duration: 1.2 });
      } else if (fitBoundsObj.bounds) {
        map.flyToBounds(fitBoundsObj.bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 1.2 });
      }
    } else if (resetView && !resetView.recentEvidence) {
      map.setView([22.9, 79.9], 5);
    }
  }, [resetView, fitBoundsObj, map]);

  

  return null;
}

export default function IndiaWatershedMap({ layers, stateId, districtId, projectId, resetView, onFieldEvidence }) {
  const [data, setData] = useState({});
  const [wdcGeotags, setWdcGeotags] = useState({ features: [], stats: null });
  const [selectedProjectGeotags, setSelectedProjectGeotags] = useState([]);
  const [fitBoundsObj, setFitBoundsObj] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all(geoDatasets.map(async (name) => {
      if (name === 'field_images') {
        const [demo, uploaded] = await Promise.all([
          fetch(`/data/${name}.geojson`).then(r => r.json()),
          fetch('/api/evidence').then(r => r.json()).catch(() => ({ features: [] }))
        ]);
        demo.features = [...demo.features, ...(uploaded.features || [])];
        return [name, demo];
      }
      return [name, await fetch(`/data/${name}.geojson`).then((response) => response.json()).catch(() => ({}))];
    }))
    .then((entries) => { if (active) setData(Object.fromEntries(entries)); });

    fetch('/api/projects/geotagged?scope=india')
      .then(res => res.json())
      .then(res => {
        if(active) {
          setWdcGeotags({
            features: res.features || [],
            stats: {
              total_projects: res.total_projects,
              total_spatial_records: res.total_spatial_records,
              states_represented: res.states_represented,
              districts_represented: res.districts_represented
            }
          });
        }
      })
      .catch(e => console.error(e));

    return () => { active = false; };
  }, [resetView]);

  // Handle Project Selection / State / District
  useEffect(() => {
    let active = true;
    
    if (projectId) {
      console.log('PROJECT SELECTED:', projectId);
      fetch(`/api/projects/geotagged?project_id=${projectId}`)
        .then(res => res.json())
        .then(res => {
          if (!active) return;
          const feats = res.features || [];
          console.log('GEOTAG RECORDS FOUND:', feats.length);
          setSelectedProjectGeotags(feats);
          
          const validFeats = feats.filter(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length >= 2);
          if (validFeats.length === 1) {
            setFitBoundsObj({ point: [validFeats[0].geometry.coordinates[1], validFeats[0].geometry.coordinates[0]] });
          } else if (validFeats.length > 1) {
            const lats = validFeats.map(f => f.geometry.coordinates[1]);
            const lons = validFeats.map(f => f.geometry.coordinates[0]);
            const bounds = [
              [Math.min(...lats), Math.min(...lons)],
              [Math.max(...lats), Math.max(...lons)]
            ];
            setFitBoundsObj({ bounds: bounds });
          }
        })
        .catch(e => console.error(e));
    } else if (districtId || stateId) {
      setSelectedProjectGeotags([]);
      let url = '/api/bounds?';
      if (stateId) url += `state_code=${stateId}`;
      if (districtId) url += `&dist_code=${districtId}`;
      
      fetch(url)
        .then(res => res.json())
        .then(res => {
          if (!active) return;
          if (res.bounds) {
            setFitBoundsObj({ bounds: res.bounds });
          }
        })
        .catch(e => console.error(e));
    } else {
      setSelectedProjectGeotags([]);
      setFitBoundsObj(null); // Return to default map view
    }

    return () => { active = false; };
  }, [projectId, districtId, stateId]);

  return (
    <MapContainer className="india-leaflet-map" center={[22.9, 79.9]} zoom={5} scrollWheelZoom aria-label="India watershed GIS map" zoomControl={false}>
      <ZoomControl position="topright" />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite (Esri)">
          <TileLayer attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.BaseLayer>
      </LayersControl>
      
      <MapViewport resetView={resetView} indiaStats={wdcGeotags.stats} fitBoundsObj={fitBoundsObj} />

      {layers.basin && <WMSTileLayer url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms" layers="bhuvan:basin" format="image/png" transparent={true} opacity={0.6} />}
      {layers.subbasin && <WMSTileLayer url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms" layers="bhuvan:subbasin" format="image/png" transparent={true} opacity={0.6} />}
      {layers.watershed && <WMSTileLayer url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms" layers="bhuvan:watershed" format="image/png" transparent={true} opacity={0.6} />}
      {layers.micro && <WMSTileLayer url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms" layers="bhuvan:micro_watershed" format="image/png" transparent={true} opacity={0.6} />}

      {layers.interventions && wdcGeotags.features.length > 0 && wdcGeotags.features.map((f, i) => {
        if (!f.geometry || !f.geometry.coordinates || f.geometry.coordinates.length < 2) return null;
        
        // If a project is selected, highlight its geotags and dim others
        let isSelected = false;
        if (projectId) {
          isSelected = selectedProjectGeotags.some(pf => pf.properties.work_serial_code === f.properties.work_serial_code);
        }
        
        const pathOptions = isSelected ? 
          { color: '#fff', fillColor: '#e84c3d', fillOpacity: 1, weight: 2 } :
          (projectId ? 
            { color: '#888', fillColor: '#aaa', fillOpacity: 0.6, weight: 1 } :
            { color: '#c0392b', fillColor: '#e74c3c', fillOpacity: 0.9, weight: 1 }
          );
        
        const radius = isSelected ? 10 : (projectId ? 6 : 8);

        return (
          <CircleMarker 
            key={f.properties.work_serial_code || i} 
            center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]} 
            radius={radius} 
            pathOptions={pathOptions}
          >
            <Popup minWidth={240}>
              <GeotagPopupContent feature={f} />
            </Popup>
          </CircleMarker>
        );
      })}

            {layers.fieldImages && (() => {
        const seenCoords = {};
        return data.field_images?.features?.filter(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length >= 2).map((feature) => {
            let lat = feature.geometry.coordinates[1];
            let lng = feature.geometry.coordinates[0];
            const key = lat.toFixed(6) + ',' + lng.toFixed(6);
            if (seenCoords[key]) {
                const count = seenCoords[key];
                const angle = count * Math.PI * 2 / 6;
                const radius = 0.0002 + (Math.floor(count/6) * 0.0002);
                lat += Math.cos(angle) * radius;
                lng += Math.sin(angle) * radius;
                seenCoords[key]++;
            } else {
                seenCoords[key] = 1;
            }
            return (
                <React.Fragment key={feature.properties.id || Math.random()}>
                  <CircleMarker center={[lat, lng]} radius={7} isRecentEvidenceMarker={resetView?.recentEvidence?.id === feature.properties.id} pathOptions={{ color: resetView?.recentEvidence?.id === feature.properties.id ? '#168a4c' : '#985a22', fillColor: resetView?.recentEvidence?.id === feature.properties.id ? '#4ade80' : '#ffcf77', fillOpacity: 1, weight: resetView?.recentEvidence?.id === feature.properties.id ? 3 : 2 }}><Popup minWidth={240}>{resetView?.recentEvidence?.id === feature.properties.id && <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#168a4c', marginBottom: '5px' }}>NEW FIELD EVIDENCE</div>}<UserEvidencePopupContent feature={feature} /></Popup></CircleMarker>
                  {feature.properties.accuracy_m && <CircleMarker center={[lat, lng]} radius={Math.max(7, Math.min(50, feature.properties.accuracy_m / 10))} pathOptions={{ color: '#168a4c', fillColor: '#168a4c', fillOpacity: 0.1, weight: 1, dashArray: '4, 4' }} interactive={false} />}
                </React.Fragment>
            );
        });
      })()}
    </MapContainer>
  );
}

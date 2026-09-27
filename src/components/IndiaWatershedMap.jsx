import React, { useEffect, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap, LayersControl, WMSTileLayer } from 'react-leaflet';
import { geoDatasets } from '../constants';

function MapViewport({ feature, resetView }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const coordinates = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    map.fitBounds(coordinates, { padding: [42, 42], maxZoom: 13 });
  }, [feature, map]);
  useEffect(() => {
    if (resetView) map.setView([22.9, 79.9], 5);
  }, [resetView, map]);
  return null;
}

export default function IndiaWatershedMap({ layers, projectId, resetView, onFieldEvidence }) {
  const [data, setData] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all(geoDatasets.map(async (name) => {
      let url = `/api/data/${name}`;
      if (name === 'field_images') {
         const [demo, uploaded] = await Promise.all([
           fetch(`/data/${name}.geojson`).then(r => r.json()),
           fetch('/api/evidence').then(r => r.json()).catch(() => ({ features: [] }))
         ]);
         demo.features = [...demo.features, ...(uploaded.features || [])];
         return [name, demo];
      }
      return [name, await fetch(`/data/${name}.geojson`).then((response) => response.json())];
    }))
      .then((entries) => { if (active) setData(Object.fromEntries(entries)); })
      .catch(() => { if (active) setData({}); });
    return () => { active = false; };
  }, []);

  const selected = data.watersheds?.features?.find((feature) => feature.properties.id === projectId);
  const selectedOnly = (dataset) => ({ ...dataset, features: dataset?.features?.filter((feature) => !projectId || feature.properties.watershed === projectId || feature.properties.id === projectId) || [] });
  const popup = (feature, title) => `<div class="leaflet-popup-content-inner"><span>DEMO DATA</span><strong>${title || feature.properties.name || feature.properties.id}</strong><p>${Object.entries(feature.properties).filter(([key]) => !['name', 'id', 'watershed'].includes(key)).slice(0, 3).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${value}`).join('<br />')}</p></div>`;
  const bindPopup = (title) => (feature, layer) => layer.bindPopup(popup(feature, title));

  return <MapContainer className="india-leaflet-map" center={[22.9, 79.9]} zoom={5} scrollWheelZoom aria-label="India watershed GIS map">
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="OpenStreetMap">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Satellite (Esri)">
        <TileLayer attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      </LayersControl.BaseLayer>
    </LayersControl>
    <MapViewport feature={selected} resetView={resetView} />
    
    {layers.states && data.india_states && <GeoJSON data={data.india_states} style={{ color: '#4d8061', weight: 1.1, fillColor: '#b5e1c4', fillOpacity: .05 }} onEachFeature={bindPopup()} />}
    {layers.districts && data.districts && <GeoJSON data={data.districts} style={{ color: '#5b8870', weight: 1, dashArray: '4 5', fillOpacity: 0 }} onEachFeature={bindPopup()} />}
    
    {/* Official Bhuvan WMS Layers for Hydrology */}
    {layers.basin && (
      <WMSTileLayer
        url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
        layers="bhuvan:basin"
        format="image/png"
        transparent={true}
        opacity={0.6}
        attribution="&copy; ISRO / NRSC Bhuvan"
      />
    )}
    {layers.subbasin && (
      <WMSTileLayer
        url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
        layers="bhuvan:subbasin"
        format="image/png"
        transparent={true}
        opacity={0.6}
        attribution="&copy; ISRO / NRSC Bhuvan"
      />
    )}
    {layers.watershed && (
      <WMSTileLayer
        url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
        layers="bhuvan:watershed"
        format="image/png"
        transparent={true}
        opacity={0.6}
        attribution="&copy; ISRO / NRSC Bhuvan"
      />
    )}
    {layers.micro && (
      <WMSTileLayer
        url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
        layers="bhuvan:micro_watershed"
        format="image/png"
        transparent={true}
        opacity={0.6}
        attribution="&copy; ISRO / NRSC Bhuvan"
      />
    )}
    {layers.waterBodies && <GeoJSON data={selectedOnly(data.water_bodies)} style={{ color: '#1174a4', weight: 1.2, fillColor: '#5ac8ee', fillOpacity: .58 }} onEachFeature={bindPopup()} />}
    {layers.rivers && <GeoJSON data={selectedOnly(data.rivers)} style={{ color: '#168ec7', weight: 3, opacity: .85 }} onEachFeature={bindPopup()} />}
    {layers.drainage && <GeoJSON data={selectedOnly(data.drainage)} style={{ color: '#279ecf', weight: 1.5, dashArray: '5 5', opacity: .8 }} onEachFeature={bindPopup('Drainage channel')} />}
    {layers.critical && data.critical_zones && <GeoJSON data={selectedOnly(data.critical_zones)} style={{ color: '#c58b23', weight: 2, fillColor: '#efbd48', fillOpacity: .24 }} onEachFeature={bindPopup('Prototype critical zone')} />}
    {layers.villages && data.villages?.features?.filter((feature) => !projectId || feature.properties.watershed === projectId).map((feature) => <CircleMarker key={feature.properties.name} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={5} pathOptions={{ color: '#3f6050', fillColor: '#f8fbf9', fillOpacity: 1, weight: 2 }}><Popup><b>{feature.properties.name}</b><br />Village · Demo data</Popup></CircleMarker>)}
    {layers.wells && data.wells?.features?.filter((feature) => !projectId || feature.properties.watershed === projectId).map((feature) => <CircleMarker key={feature.properties.id} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={5} pathOptions={{ color: '#236c8c', fillColor: '#b7edff', fillOpacity: 1, weight: 2 }}><Popup><b>{feature.properties.name}</b><br />Depth: {feature.properties.depth}<br />Demo data</Popup></CircleMarker>)}
    {layers.interventions && data.interventions?.features?.filter((feature) => !projectId || feature.properties.watershed === projectId).map((feature) => <CircleMarker key={feature.properties.id} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={7} pathOptions={{ color: '#147d42', fillColor: '#d7e85d', fillOpacity: 1, weight: 2 }}><Popup><b>{feature.properties.type}</b><br />{feature.properties.id}<br />Status: {feature.properties.status}<br />Condition: {feature.properties.condition}<br /><small>Prototype data</small></Popup></CircleMarker>)}
    {layers.fieldImages && data.field_images?.features?.filter((feature) => !projectId || feature.properties.watershed === projectId).map((feature) => <CircleMarker key={feature.properties.id} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={7} eventHandlers={{ click: () => onFieldEvidence(feature) }} pathOptions={{ color: '#985a22', fillColor: '#ffcf77', fillOpacity: 1, weight: 2 }}><Popup><b>FIELD EVIDENCE</b><br />{feature.properties.category}<br />{feature.properties.date}<br />{feature.geometry.coordinates[1].toFixed(5)}, {feature.geometry.coordinates[0].toFixed(5)}<br /><small>{feature.properties.description}</small></Popup></CircleMarker>)}
  </MapContainer>;
}

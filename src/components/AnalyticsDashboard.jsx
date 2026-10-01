import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { MapContainer, TileLayer, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsDashboard() {
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [mapLayer, setMapLayer] = useState('ndvi');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jid = params.get('job_id');
    if (jid) {
      setJobId(jid);
      pollJob(jid);
      
      // Scroll to analytics section automatically if job_id is present
      setTimeout(() => {
        document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  const pollJob = (jid) => {
    const interval = setInterval(() => {
      fetch('/api/analysis/' + jid + '/status')
        .then(res => res.json())
        .then(data => {
          setJobStatus(data);
          if (data.status === 'complete') {
            clearInterval(interval);
            fetch('/api/analysis/' + jid + '/results')
              .then(r => r.json())
              .then(res => setAnalysisData(res));
          } else if (data.status === 'failed') {
            clearInterval(interval);
          }
        });
    }, 2000);
  };

  if (jobId && !analysisData) {
    return (
      <section className="content-width data-section" id="analytics" style={{ marginTop: '40px' }}>
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <h3>Processing Satellite Analysis...</h3>
          <p>{jobStatus ? jobStatus.current_step : 'Initializing...'}</p>
          <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: '#eee', margin: '20px auto', borderRadius: '4px' }}>
            <div style={{ width: `${jobStatus ? jobStatus.progress : 0}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.5s' }}></div>
          </div>
        </div>
      </section>
    );
  }

  // Use real data if available, otherwise fallback to defaults
  const currentNdvi = analysisData ? analysisData.statistics.mean : 0.45;
  const currentNdwi = analysisData ? analysisData.ndwi.mean : -0.15;
  
  // 1. NDVI Trend Over Time
  const ndviData = {
    labels: ['6 Months Ago', '5 Months Ago', '4 Months Ago', '3 Months Ago', '2 Months Ago', 'Last Month', 'Current'],
    datasets: [{
      label: 'Mean NDVI',
      data: [0.32, 0.35, 0.38, 0.36, 0.40, 0.42, currentNdvi],
      borderColor: 'rgb(22, 138, 76)',
      backgroundColor: 'rgba(22, 138, 76, 0.2)',
      fill: true,
      tension: 0.4
    }]
  };

  // 2. NDWI / Water-Area Trend
  const ndwiData = {
    labels: ['6 Months Ago', '5 Months Ago', '4 Months Ago', '3 Months Ago', '2 Months Ago', 'Last Month', 'Current'],
    datasets: [{
      label: 'Mean NDWI',
      data: [-0.25, -0.22, -0.18, -0.20, -0.19, -0.17, currentNdwi],
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.2)',
      fill: true,
      tension: 0.4
    }]
  };

  // 3. Rainfall Trend
  const rainData = {
    labels: ['6 Months Ago', '5 Months Ago', '4 Months Ago', '3 Months Ago', '2 Months Ago', 'Last Month', 'Current'],
    datasets: [{
      label: 'Rainfall (mm)',
      data: [40, 45, 120, 180, 150, 80, 50],
      backgroundColor: 'rgba(53, 162, 235, 0.7)'
    }]
  };

  // 4. Rainfall vs Water Response (Scatter)
  const scatterData = {
    datasets: [{
      label: 'Rainfall (x) vs NDWI (y)',
      data: [
        {x: 40, y: -0.25}, {x: 45, y: -0.22}, {x: 120, y: -0.18},
        {x: 180, y: -0.20}, {x: 150, y: -0.19}, {x: 80, y: -0.17},
        {x: 50, y: currentNdwi}
      ],
      backgroundColor: 'rgb(217, 67, 67)'
    }]
  };

  // 5. Land Use / Land Cover Change (Stacked Bar)
  const vegClasses = analysisData ? [
    analysisData.vegetation_classes['very_low_pct'],
    analysisData.vegetation_classes['low_pct'],
    analysisData.vegetation_classes['moderate_pct'],
    analysisData.vegetation_classes['high_pct'],
    analysisData.vegetation_classes['very_high_pct']
  ] : [10, 20, 40, 20, 10];
  
  const lulcData = {
    labels: ['2022', '2023', 'Current (Analysis)'],
    datasets: [
      { label: 'Very Low Veg', data: [30, 25, vegClasses[0]], backgroundColor: '#f0f9e8' },
      { label: 'Low Veg', data: [30, 25, vegClasses[1]], backgroundColor: '#bae4bc' },
      { label: 'Moderate Veg', data: [20, 25, vegClasses[2]], backgroundColor: '#7bccc4' },
      { label: 'High Veg', data: [15, 15, vegClasses[3]], backgroundColor: '#43a2ca' },
      { label: 'Very High Veg', data: [5, 10, vegClasses[4]], backgroundColor: '#0868ac' }
    ]
  };

  // 6. Watershed Intervention Status
  const interventionData = {
    labels: ['Check Dams Built', 'Trenches Dug', 'Farm Ponds Created', 'Plantations'],
    datasets: [{
      label: 'Completion Status (%)',
      data: [85, 90, 60, 45],
      backgroundColor: 'rgba(243, 156, 18, 0.7)',
      indexAxis: 'y'
    }]
  };

  return (
    <section className="content-width data-section" id="analytics" style={{ marginTop: '40px' }}>
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span /> SATELLITE ANALYSIS RESULTS</div>
          <h2>Interactive Visualizations</h2>
          <p>Comprehensive charts integrating live satellite pipeline data with watershed metrics.</p>
        </div>
      </div>

      {analysisData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
            <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Satellite Imagery Overlay</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ marginRight: '15px' }}>
                <input type="radio" checked={mapLayer === 'ndvi'} onChange={() => setMapLayer('ndvi')} /> NDVI
              </label>
              <label>
                <input type="radio" checked={mapLayer === 'ndwi'} onChange={() => setMapLayer('ndwi')} /> NDWI
              </label>
            </div>
            <div style={{ height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
              <MapContainer 
                bounds={analysisData.bounds}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {mapLayer === 'ndvi' && <ImageOverlay url={analysisData.preview_url} bounds={analysisData.bounds} opacity={0.7} />}
                {mapLayer === 'ndwi' && <ImageOverlay url={analysisData.ndwi_preview_url} bounds={analysisData.bounds} opacity={0.7} />}
              </MapContainer>
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
            <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Current Scene Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <strong>NDVI (Vegetation)</strong>
                <p>Mean: {analysisData.statistics.mean.toFixed(3)}</p>
                <p>Max: {analysisData.statistics.max.toFixed(3)}</p>
              </div>
              <div>
                <strong>NDWI (Water)</strong>
                <p>Mean: {analysisData.ndwi.mean.toFixed(3)}</p>
                <p>Max: {analysisData.ndwi.max.toFixed(3)}</p>
              </div>
            </div>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>Scene ID: {analysisData.scene_id}</p>
            <p style={{ fontSize: '14px', color: '#666' }}>Acquired: {analysisData.acquisition_date}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>1. NDVI Trend Over Time</h3>
          <Line data={ndviData} />
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>2. NDWI / Water-Area Trend</h3>
          <Line data={ndwiData} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>3. Rainfall Trend</h3>
          <Bar data={rainData} />
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>4. Rainfall vs Water Response</h3>
          <Scatter data={scatterData} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>5. Land Use / Land Cover Change</h3>
          <Bar data={lulcData} options={{ scales: { x: { stacked: true }, y: { stacked: true } } }} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>6. Watershed Intervention Status</h3>
          <Bar data={interventionData} options={{ indexAxis: 'y' }} />
        </div>
      </div>
    </section>
  );
}

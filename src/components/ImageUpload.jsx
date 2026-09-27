import React, { useRef, useState } from 'react';
import { Camera, Upload, X, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon issue with Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function ImageUpload({ onUpload, onCancel }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [needsManualLocation, setNeedsManualLocation] = useState(false);
  const [manualPosition, setManualPosition] = useState(null);
  
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');

  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setNeedsManualLocation(false);
    setManualPosition(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('category', category);
    
    if (manualPosition) {
      formData.append('latitude', manualPosition.lat);
      formData.append('longitude', manualPosition.lng);
    }

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.detail && data.detail.includes("GPS metadata not found")) {
          setNeedsManualLocation(true);
          setError("GPS metadata not found. Select location manually.");
        } else {
          setError(data.detail || 'Error uploading image.');
        }
      } else {
        onUpload({
          file,
          data
        });
      }
    } catch (err) {
      setError('Server connection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal" style={{ width: needsManualLocation ? '600px' : '400px' }}>
        <div className="upload-header">
          <h3>Upload Field Evidence</h3>
          <button className="icon-button" type="button" onClick={onCancel}><X size={18} /></button>
        </div>
        
        {!file ? (
          <div 
            className={`upload-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <Camera size={36} className="upload-icon" />
            <p>Drag and drop an image here</p>
            <small>or click to browse</small>
            <input 
              ref={inputRef}
              type="file" 
              accept="image/*" 
              onChange={(e) => processFile(e.target.files[0])} 
              style={{ display: 'none' }} 
            />
          </div>
        ) : (
          <div className="upload-form">
            <div className="preview-info">
              <strong>{file.name}</strong>
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>General</option>
                <option>Water Harvesting Structure</option>
                <option>Soil & Moisture Conservation</option>
                <option>Plantation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="Enter details about this field evidence..."
                rows={3}
              />
            </div>

            {needsManualLocation && (
              <div className="manual-location-picker" style={{ height: '250px', marginBottom: '15px', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '5px', background: '#fff0f0', color: '#d94343', fontSize: '13px', textAlign: 'center' }}>
                  Location selected manually {manualPosition ? `(${manualPosition.lat.toFixed(4)}, ${manualPosition.lng.toFixed(4)})` : '(Click on map)'}
                </div>
                <MapContainer center={[22.9, 79.9]} zoom={4} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker position={manualPosition} setPosition={setManualPosition} />
                </MapContainer>
              </div>
            )}

            <div className="upload-actions">
              <button className="button button-secondary" type="button" onClick={() => { setFile(null); setNeedsManualLocation(false); setManualPosition(null); setError(''); }}>Choose Another</button>
              <button className="button button-primary" type="button" onClick={handleSubmit} disabled={isProcessing || (needsManualLocation && !manualPosition)}>
                <Upload size={16} /> {isProcessing ? 'Processing...' : (needsManualLocation ? 'Submit with Manual Location' : 'Submit Evidence')}
              </button>
            </div>
          </div>
        )}

        {error && !needsManualLocation && <div className="upload-error">{error}</div>}
      </div>
    </div>
  );
}

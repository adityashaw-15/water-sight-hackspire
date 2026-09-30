with open('src/components/ImageUpload.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

old_submit = r'const handleSubmit = async \(\) => \{.*?<\/div>\n    <\/div>\n  \);'

new_submit = '''const handleSubmit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');
    
    // First, attempt to upload directly. Backend will use EXIF if available.
    // If not, it will return MISSING_GPS error.
    setLocationStatusMsg('Uploading evidence...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('category', category);
    
    if (manualPosition) {
      formData.append('latitude', manualPosition.lat);
      formData.append('longitude', manualPosition.lng);
    }

    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        body: formData
      });
      
      const payload = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (payload.error_code === 'MISSING_GPS' && !manualPosition) {
          // EXIF was missing. Let's try live location.
          setLocationStatusMsg('Image has no geotag. Requesting live location...');
          
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                setLocationStatusMsg('Location captured. Saving evidence...');
                // Try uploading again but with live coords
                formData.append('latitude', position.coords.latitude);
                formData.append('longitude', position.coords.longitude);
                formData.append('gps_source', 'browser_live');
                if (position.coords.accuracy) formData.append('accuracy_m', position.coords.accuracy);
                
                const liveRes = await fetch('/api/evidence', { method: 'POST', body: formData });
                const livePayload = await liveRes.json().catch(() => ({}));
                
                if (liveRes.ok) {
                  setLocationStatusMsg('Evidence saved successfully with live location.');
                  onUpload({ file, data: livePayload });
                } else {
                  setError(livePayload.message || 'Upload failed with live location.');
                }
                setIsProcessing(false);
              },
              (error) => {
                // Denied or failed
                setNeedsManualLocation(true);
                setError('Location access denied or unavailable. Please select location manually on the map.');
                setLocationStatusMsg('');
                setIsProcessing(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          } else {
            setNeedsManualLocation(true);
            setError('Location not supported by browser. Please select location manually.');
            setLocationStatusMsg('');
            setIsProcessing(false);
          }
          return; // Stop here, wait for geolocation or manual
        }
        
        if (res.status === 401) throw new Error("Please log in to upload field evidence.");
        if (res.status === 413) throw new Error("Image is too large.");
        if (res.status === 500) throw new Error("Server error while saving evidence.");
        throw new Error(payload.message || `Upload failed (${res.status})`);
      }
      
      setLocationStatusMsg('Evidence saved successfully.');
      onUpload({ file, data: payload });
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        setError('Watersight backend is unreachable.');
      } else {
        setError(err.message);
      }
    } finally {
      if (!locationStatusMsg.includes('Requesting live location')) {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal" style={{ width: needsManualLocation ? '800px' : '400px' }}>
        <div className="upload-header">
          <h3>Upload Field Evidence</h3>
          <button className="icon-button" type="button" onClick={onCancel}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            {!file ? (
              <div
                className={`upload-zone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <Upload size={32} />
                <p>Click or drag image to upload field evidence</p>
                <small>Supports JPG, PNG with EXIF GPS data</small>
              </div>
            ) : (
              <div className="upload-form">
                <div className="file-preview">
                  <div className="preview-image" style={{ backgroundImage: `url(${previewUrl})` }} />
                  <div className="file-details">
                    <strong>{file.name}</strong>
                    <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                  <button className="text-button" type="button" onClick={() => { setFile(null); setPreviewUrl(null); setNeedsManualLocation(false); setManualPosition(null); }}>Choose another</button>
                </div>
                
                <div className="form-group">
                  <label>Evidence Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} disabled={isProcessing}>
                    <option value="check_dam">Check Dam Construction</option>
                    <option value="trench">Contour Trench</option>
                    <option value="plantation">Plantation / Afforestation</option>
                    <option value="farm_pond">Farm Pond</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Field Notes / Description</label>
                  <textarea 
                    placeholder="Enter observations..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    disabled={isProcessing}
                  />
                </div>

                {error && <div className="error-alert">{error}</div>}

                <div className="upload-actions">
                  <button className="button button-secondary" type="button" onClick={onCancel} disabled={isProcessing}>Cancel</button>
                  <button className="button button-primary" type="button" onClick={handleSubmit} disabled={isProcessing || (needsManualLocation && !manualPosition)}>
                    <Upload size={16} /> {isProcessing ? (locationStatusMsg.includes('\\n') ? 'Processing...' : (locationStatusMsg || 'Processing...')) : (needsManualLocation ? 'Submit with Manual Location' : 'Submit Evidence')}
                  </button>
                </div>
                {isProcessing && locationStatusMsg && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px', fontSize: '13px', whiteSpace: 'pre-line', border: '1px solid #e9ecef', color: '#495057' }}>
                    {locationStatusMsg}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {needsManualLocation && (
            <div style={{ flex: 1, height: '450px', borderLeft: '1px solid #e9ecef', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2b3643', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={16} /> Select Location on Map
              </h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#6c757d' }}>Click anywhere on the map to manually set the location of this field evidence.</p>
              <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
                <MapContainer center={[22.9, 79.9]} zoom={4} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <LocationPicker position={manualPosition} setPosition={setManualPosition} />
                </MapContainer>
              </div>
              {manualPosition && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#168a4c', background: '#e8f5e9', padding: '8px', borderRadius: '4px' }}>
                  Selected: {manualPosition.lat.toFixed(6)}, {manualPosition.lng.toFixed(6)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );'''

text = re.sub(old_submit, new_submit, text, flags=re.DOTALL)

with open('src/components/ImageUpload.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

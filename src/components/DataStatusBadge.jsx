import React from 'react';
import { Database, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function DataStatusBadge({ status, sourceName, error }) {
  const isConnected = status === 'official';
  const isError = status === 'unavailable';

  return (
    <div className={`status-badge ${isConnected ? 'official-badge' : isError ? 'error-badge' : 'demo-badge'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        {isConnected ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
        <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Source: {sourceName}
        </span>
      </div>
      <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.5 }}>
        <div><strong>Connection:</strong> {isConnected ? 'Connected' : isError ? 'Failed' : 'Demo Mode'}</div>
        <div><strong>Last successful sync:</strong> 27 Sep 2026, 10:42 IST</div>
        <div><strong>Data type:</strong> {isConnected ? 'Normalized JSON (from official JSON/HTML)' : isError ? 'Error: ' + error : 'Prototype JSON'}</div>
      </div>
    </div>
  );
}

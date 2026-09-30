import React from 'react';
import { Database, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function DataStatusBadge({ status, sourceName, error }) {
  const isConnected = status === 'official' || status === 'cached' || status === 'Cached Official Data';
  const isCached = status === 'cached' || status === 'Cached Official Data' || (status && status.includes('Using Official Cache'));
  const isError = status === 'unavailable' || (status && status.includes('Temporarily offline'));

  return (
    <div className={`status-badge ${isConnected ? 'official-badge' : isError ? 'error-badge' : 'demo-badge'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        {isConnected ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
        <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Source: {sourceName}
        </span>
      </div>
      <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.5 }}>
        <div><strong>Connection:</strong> {isCached ? (isError ? status : 'Cached Official Data') : isConnected ? 'Connected' : isError ? 'Unavailable' : 'Demo Mode'}</div>
        <div><strong>Last successful sync:</strong> {isCached ? 'Available in Cache' : 'Live'}</div>
        <div><strong>Data type:</strong> {isConnected ? 'Normalized JSON' : isError ? 'Error: ' + error : 'Prototype JSON'}</div>
      </div>
    </div>
  );
}

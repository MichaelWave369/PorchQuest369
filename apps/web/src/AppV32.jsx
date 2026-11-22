import React, { useEffect, useState } from 'react';
import ClassicAdventure from './AppV31.jsx';
import LivingTable from './LivingTable.jsx';
import './livingTable.css';

// Preserve the full v1.0.6 campaign/studio experience behind a reversible switch.
// Living Table uses a separate save key; no automatic migration or deletion occurs.
const MODE_KEY = 'porchquest369.shellMode.v1';
export default function AppV32() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) === 'classic' ? 'classic' : 'living'; }
    catch { return 'living'; }
  });
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch { /* storage can be disabled */ } }, [mode]);
  return <div>
    <nav className="lt-switch" aria-label="PorchQuest play modes">
      <strong>PORCHQUEST369</strong>
      <div>
        <button type="button" aria-pressed={mode === 'living'} className={mode === 'living' ? 'active' : ''}
          onClick={() => setMode('living')}>The Living Table · Beta</button>
        <button type="button" aria-pressed={mode === 'classic'} className={mode === 'classic' ? 'active' : ''}
          onClick={() => setMode('classic')}>Classic Adventure + Creator Studio</button>
      </div>
    </nav>
    {mode === 'living' ? <LivingTable /> : <ClassicAdventure />}
  </div>;
}

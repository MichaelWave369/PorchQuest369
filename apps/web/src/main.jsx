import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dice5, ScrollText, Backpack, Map, Sparkles } from 'lucide-react';
import './styles.css';
import AppV6 from './AppV6.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV6 icons={{ Dice5, ScrollText, Backpack, Map, Sparkles }} />
  </React.StrictMode>
);

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dice5, ScrollText, Backpack, Map, Sparkles } from 'lucide-react';
import './styles.css';
import './v7.css';
import AppV7 from './AppV7.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV7 icons={{ Dice5, ScrollText, Backpack, Map, Sparkles }} />
  </React.StrictMode>
);

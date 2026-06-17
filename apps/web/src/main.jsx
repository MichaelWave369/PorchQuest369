import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dice5, ScrollText, Backpack, Map, Sparkles } from 'lucide-react';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App icons={{ Dice5, ScrollText, Backpack, Map, Sparkles }} />
  </React.StrictMode>
);

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v22.css';
import './v23.css';
import AppV23 from './AppV23.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV23 />
  </React.StrictMode>
);

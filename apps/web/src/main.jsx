import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v22.css';
import AppV22 from './AppV22.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV22 />
  </React.StrictMode>
);

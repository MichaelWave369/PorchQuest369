import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v20.css';
import AppV20 from './AppV20.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV20 />
  </React.StrictMode>
);

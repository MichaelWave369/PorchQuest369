import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v21.css';
import AppV21 from './AppV21.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV21 />
  </React.StrictMode>
);

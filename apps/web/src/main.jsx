import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v7.css';
import './v8.css';
import './v9.css';
import AppV9 from './AppV9.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV9 />
  </React.StrictMode>
);

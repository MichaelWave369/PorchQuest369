import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v7.css';
import './v8.css';
import AppV8 from './AppV8.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV8 />
  </React.StrictMode>
);

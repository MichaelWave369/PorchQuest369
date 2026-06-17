import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './v7.css';
import './v8.css';
import './v9.css';
import './v10.css';
import AppV10 from './AppV10.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV10 />
  </React.StrictMode>
);

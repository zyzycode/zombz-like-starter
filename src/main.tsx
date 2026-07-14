import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

/** Точка входа React-приложения. */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

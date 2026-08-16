import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import '../assets/css/variables.css';
import '../assets/css/base.css';
import '../assets/css/layout.css';
import '../assets/css/components.css';
import '../assets/css/animations.css';
import '../assets/css/rtl.css';
import '../assets/css/responsive.css';
import '../assets/css/header.css';
import './app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';
import { seedInitialMultiTenantSchema } from './services/multiTenantFirestoreService';

// Validate Firestore connection on boot as required by Firebase skill
testConnection();

// Initialize initial Firestore schema collections ('Empresas', 'Unidades', 'Produtos', 'Pedidos')
if (typeof window !== 'undefined') {
  const hasSeeded = localStorage.getItem('neon_firestore_schema_seeded_v1');
  if (!hasSeeded) {
    seedInitialMultiTenantSchema()
      .then(() => {
        localStorage.setItem('neon_firestore_schema_seeded_v1', 'true');
      })
      .catch((err) => {
        console.warn('Boot multi-tenant schema sync info:', err);
      });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

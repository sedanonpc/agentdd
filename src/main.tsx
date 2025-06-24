import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initializeMigration } from './services/migrationService';
import { setupDatabase } from './services/setupDatabaseService';

// Initialize database and run migrations
const initializeApp = async () => {
  try {
    // Setup database tables
    await setupDatabase();
    
    // Run migrations if needed
    await initializeMigration();
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Start initialization process
initializeApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <App />
    </BrowserRouter>
  </StrictMode>
);
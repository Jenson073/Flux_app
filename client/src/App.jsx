import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import UploadsSection from './components/UploadsSection';
import TransactionsSection from './components/TransactionsSection';
import MatchesSection from './components/MatchesSection';
import ApprovalsSection from './components/ApprovalsSection';
import CategorisationSection from './components/CategorisationSection';
import AnomaliesSection from './components/AnomaliesSection';
import AlertsSection from './components/AlertsSection';
import AuditLogSection from './components/AuditLogSection';

function App() {
  const [currentPage, setCurrentPage] = useState('uploads');

  const renderContent = () => {
    switch (currentPage) {
      case 'uploads':
        return <UploadsSection />;
      case 'transactions':
        return <TransactionsSection />;
      case 'matches':
        return <MatchesSection />;
      case 'approvals':
        return <ApprovalsSection />;
      case 'categorise':
        return <CategorisationSection />;
      case 'anomalies':
        return <AnomaliesSection />;
      case 'alerts':
        return <AlertsSection />;
      case 'audit':
        return <AuditLogSection />;
      default:
        return <UploadsSection />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;

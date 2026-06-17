import { 
  Upload, 
  FileText, 
  GitCompare, 
  CheckCircle, 
  Layers, 
  AlertTriangle, 
  Activity, 
  TrendingUp,
  Bell
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage }) {
  const menuItems = [
    { id: 'uploads', name: 'Document Upload', icon: Upload },
    { id: 'transactions', name: 'Transactions', icon: FileText },
    { id: 'matches', name: 'Smart Matching', icon: GitCompare },
    { id: 'approvals', name: 'Approval Queue', icon: CheckCircle },
    { id: 'categorise', name: 'Categorisation', icon: Layers },
    { id: 'anomalies', name: 'Anomalies', icon: AlertTriangle },
    { id: 'alerts', name: 'Ledger Alerts', icon: Bell },
    { id: 'audit', name: 'Audit Log', icon: Activity },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <TrendingUp className="logo-icon" size={28} />
        <span className="logo-text">Flux AI</span>
      </div>
      
      <nav className="nav-links">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon className="nav-item-icon" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      
    </aside>
  );
}

import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import OverviewTab from '../components/tabs/OverviewTab';
import PlaygroundTab from '../components/tabs/PlaygroundTab';
import KnowledgeBaseTab from '../components/tabs/KnowledgeBaseTab';
import AnalyticsTab from '../components/tabs/AnalyticsTab';
import WidgetStudioTab from '../components/tabs/WidgetStudioTab';
import IntegrationTab from '../components/tabs/IntegrationTab';
import ConversationsTab from '../components/tabs/ConversationsTab';
import ClientsTab from '../components/tabs/ClientsTab';
import BusinessProfileTab from '../components/tabs/BusinessProfileTab';
import BillingTab from '../components/tabs/BillingTab';
import LeadsTab from '../components/tabs/LeadsTab';
import '../App.css';

/**
 * DashboardContent — renders the active tab based on context state.
 * This is the inner component that consumes DashboardContext.
 */
function DashboardContent() {
  const { activeTab } = useDashboard();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':      return <OverviewTab />;
      case 'playground':    return <PlaygroundTab />;
      case 'documents':     return <KnowledgeBaseTab />;
      case 'analytics':     return <AnalyticsTab />;
      case 'widget':        return <WidgetStudioTab />;
      case 'integration':   return <IntegrationTab />;
      case 'conversations': return <ConversationsTab />;
      case 'clients':       return <ClientsTab />;
      case 'profile':       return <BusinessProfileTab />;
      case 'billing':       return <BillingTab />;
      case 'leads':         return <LeadsTab />;
      default:              return <OverviewTab />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <div className="main-scroll-area">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}

/**
 * Dashboard — wraps everything in the DashboardProvider.
 * This is the page-level component rendered by the router.
 */
export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

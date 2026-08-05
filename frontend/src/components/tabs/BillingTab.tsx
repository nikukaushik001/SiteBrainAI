import { useDashboard } from '../../context/DashboardContext';

export default function BillingTab() {
  const { userRole } = useDashboard();

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Billing & Subscription</h1>
          <p>Manage your payment methods, view invoices, and upgrade your plan.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Current Plan Card */}
        <div className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden', border: '1px solid var(--accent-indigo)' }}>
          {/* Subtle glowing background effect */}
          <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 50%)', zIndex: 0, pointerEvents: 'none' }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', borderRadius: '12px', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
                  ACTIVE PLAN
                </div>
                <h3 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>
                  {userRole === 'admin' ? 'Agency Pro Plan' : 'AI Autopilot Plan'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                  Next billing date: <strong>Oct 1, 2026</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>
                  {userRole === 'admin' ? '$199' : '$49'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>per month</div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Upgrade Plan</button>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel Subscription</button>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            💳 Payment Method
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '48px', height: '32px', background: '#1a1f36', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '12px', fontStyle: 'italic' }}>
              VISA
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: 600 }}>•••• •••• •••• 4242</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Expires 12/28</div>
            </div>
          </div>

          <button className="btn-secondary" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Update Payment Method
          </button>
        </div>

      </div>

      {/* Invoice History */}
      <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Invoice History</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={{ paddingBottom: '12px', fontWeight: 500 }}>Date</th>
              <th style={{ paddingBottom: '12px', fontWeight: 500 }}>Amount</th>
              <th style={{ paddingBottom: '12px', fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: '12px', fontWeight: 500, textAlign: 'right' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: 'Sep 1, 2026', amount: userRole === 'admin' ? '$199.00' : '$49.00', status: 'Paid' },
              { date: 'Aug 1, 2026', amount: userRole === 'admin' ? '$199.00' : '$49.00', status: 'Paid' },
              { date: 'Jul 1, 2026', amount: userRole === 'admin' ? '$199.00' : '$49.00', status: 'Paid' }
            ].map((invoice, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px 0', color: 'white' }}>{invoice.date}</td>
                <td style={{ padding: '16px 0', color: 'white' }}>{invoice.amount}</td>
                <td style={{ padding: '16px 0' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', fontSize: '11px', fontWeight: 600 }}>
                    {invoice.status}
                  </span>
                </td>
                <td style={{ padding: '16px 0', textAlign: 'right' }}>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-indigo)', cursor: 'pointer', fontSize: '13px' }}>
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

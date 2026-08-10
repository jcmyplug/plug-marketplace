import React from 'react';
import ReactDOM from 'react-dom/client';
import PlugApp from './PlugMarketplace';

/* ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
   PlugMarketplace is a single ~11,800-line component tree. Without a boundary,
   any render-time throw — one undefined.map on a vendor with no photos — unmounts
   the entire application and leaves a blank white page, with nothing logged
   anywhere you would see it.

   This catches the throw, keeps the user on something they can act on, and
   records the error. When you add Sentry, report() is the single place to wire
   it up; everything else here can stay as it is.
────────────────────────────────────────────────────────────────────────────── */

function report(error, info) {
  /* Visible in the browser console and in Vercel's client logs. Replace or
     augment with Sentry.captureException(error, { extra: info }) later. */
  console.error('[PLUG] Unhandled render error:', error, info?.componentStack);
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    report(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const wrap = {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: '#0A0A0A',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    };
    const card = { maxWidth: 460, width: '100%', textAlign: 'left', color: '#fff' };
    const btn = {
      display: 'inline-block', padding: '12px 22px', borderRadius: 999,
      background: '#FF5C28', color: '#fff', fontWeight: 700, fontSize: 15,
      border: 'none', cursor: 'pointer',
    };
    const ghost = {
      ...btn, background: 'transparent', color: 'rgba(255,255,255,0.7)',
      border: '1px solid rgba(255,255,255,0.25)', marginLeft: 10,
    };

    return (
      <div style={wrap}>
        <div style={card}>
          <p style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            plug
          </p>
          <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Something broke on our end.
          </h1>
          <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)' }}>
            This is our fault, not yours — and nothing you were working on has been
            lost. Reloading usually clears it.
          </p>

          <button type="button" style={btn} onClick={() => window.location.reload()}>
            Reload the page
          </button>
          <button
            type="button"
            style={ghost}
            onClick={() => { window.location.href = '/'; }}
          >
            Start over
          </button>

          {/* The message is useful when someone reports the problem, but a raw
              stack trace on a consumer site is noise. Kept collapsed. */}
          <details style={{ marginTop: 26 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Technical details
            </summary>
            <pre style={{
              marginTop: 10, padding: 12, borderRadius: 10, fontSize: 11,
              lineHeight: 1.55, color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', maxHeight: 180, overflow: 'auto',
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

/* Async failures never reach componentDidCatch, so they are logged separately.
   Without these, a rejected fetch in an event handler disappears silently. */
window.addEventListener('unhandledrejection', (e) => {
  console.error('[PLUG] Unhandled promise rejection:', e.reason);
});
window.addEventListener('error', (e) => {
  if (e.error) console.error('[PLUG] Uncaught error:', e.error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <PlugApp />
  </ErrorBoundary>
);

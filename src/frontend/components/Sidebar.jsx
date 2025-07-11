import React, { useState } from 'react';
import SidebarLink from './SidebarLink';

const Sidebar = () => {
    const [workspacesOpen, setWorkspacesOpen] = useState(false);
    return (
        <aside style={{
            width: 220,
            minHeight: 'calc(100vh - 80px)',
            background: '#fff',
            boxShadow: '2px 0 8px #e0e0e0',
            padding: '32px 16px 16px 16px',
            position: 'relative',
            top: 0,
            left: 0,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
        }}>
            <div style={{ fontWeight: 'bold', fontSize: 18, color: '#22223b', marginBottom: 20, letterSpacing: 1, minHeight: 32 }}>
                {/* Empty for spacing between header and options */}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <SidebarLink to="/" label="Workspace Layout" />
                </div>
                <div style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => setWorkspacesOpen((open) => !open)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#22223b',
                      fontWeight: 600,
                      fontSize: 16,
                      fontFamily: 'sans-serif',
                      letterSpacing: 0.5,
                      textAlign: 'left',
                      padding: '10px 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ flex: 1 ,fontFamily: 'Inter, sans-serif'}}>Workspaces</span>
                    <span style={{ fontSize: 18, transition: 'transform 0.2s', transform: workspacesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </button>
                  {workspacesOpen && (
                    <div style={{ marginLeft: 12, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <SidebarLink to="/section/A" label="Section A" />
                      <SidebarLink to="/section/B" label="Section B" />
                      <SidebarLink to="/section/C" label="Section C" />
                      <SidebarLink to="/section/D" label="Section D" />
                      <SidebarLink to="/section/E" label="Section E" />
                      <SidebarLink to="/section/F" label="Section F" />
                      <SidebarLink to="/section/G" label="Section G" />
                    </div>
                  )}
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Target, 
  Route, 
  Briefcase,
  FolderCode,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronUp
} from 'lucide-react';
import { getCareerState } from '../../lib/api';
import DashboardOverview from './components/DashboardOverview';
import SkillAnalysisView from './components/SkillAnalysisView';
import RoadmapGenerationView from './components/RoadmapGenerationView';
import ProjectRecommendationView from './components/ProjectRecommendationView';
import JobRecommendationView from './components/JobRecommendationView';

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentTab = searchParams.get('tab') || 'dashboard';

  // State for profile popup menu
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileRole, setProfileRole] = useState(null);
  const profileCardRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getCareerState()
      .then((state) => {
        if (!mounted) return;
        if (state?.profile?.dream_job_role) {
          setProfileRole(state.profile.dream_job_role);
        } else if (state?.analysis?.role) {
          setProfileRole(state.analysis.role);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Close popup if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileCardRef.current && !profileCardRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyzer', label: 'Skill Analysis', icon: Target },
    { id: 'roadmap', label: 'Roadmap Generation', icon: Route },
    { id: 'projects', label: 'Project Recommendation', icon: FolderCode },
    { id: 'jobs', label: 'Job Recommendation', icon: Briefcase },
  ];

  // Derive user info or fallback to Prateek
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Prateek';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="px-2 mb-3">
              <span className="small text-uppercase fw-bold" style={{ color: 'var(--text-muted)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                WORKSPACE
              </span>
            </div>

            <nav className="dashboard-nav-list d-flex flex-column gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`dashboard-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Interactive User profile snippet with popup */}
          <div className="mt-auto position-relative" ref={profileCardRef}>
            {/* Pop-up Menu */}
            {isProfileMenuOpen && (
              <div className="sidebar-profile-popup">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    alert('Opening Account details...');
                  }}
                  className="sidebar-popup-item"
                >
                  <UserIcon size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    alert('Opening Settings...');
                  }}
                  className="sidebar-popup-item"
                >
                  <Settings size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Settings</span>
                </button>

                <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '0.2rem 0' }}></div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="sidebar-popup-item logout"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Profile trigger card */}
            <div
              className="sidebar-profile-card d-flex align-items-center justify-content-between"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              title="View account options"
            >
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-uppercase fw-bold flex-shrink-0"
                  style={{ width: 32, height: 32, backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '0.8rem' }}
                >
                  {initial}
                </div>
                <div className="overflow-hidden">
                  <span className="small fw-bold d-block text-truncate" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {displayName}
                  </span>
                  <span className="small d-block text-truncate" style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Target: {profileRole || 'Frontend / AI'}
                  </span>
                </div>
              </div>
              <ChevronUp 
                size={15} 
                style={{ 
                  color: 'var(--text-muted)',
                  transform: isProfileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </div>
          </div>
        </aside>

        {/* Dynamic Main Content based on active sidebar tab */}
        <main className="dashboard-main-content">
          {currentTab === 'dashboard' && <DashboardOverview onNavigate={setTab} />}
          {currentTab === 'analyzer' && <SkillAnalysisView onRoleChange={(newRole) => setProfileRole(newRole)} />}
          {currentTab === 'roadmap' && <RoadmapGenerationView />}
          {currentTab === 'projects' && <ProjectRecommendationView />}
          {currentTab === 'jobs' && <JobRecommendationView />}
        </main>
      </div>
    </div>
  );
}

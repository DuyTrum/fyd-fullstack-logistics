import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { isLoggedIn, logout } from '@shared/utils/authSession';
import { authAPI, formatDate, dashboardAPI, BASE_URL, getAssetUrl } from '@shared/utils/api';
import Toast from '@shared/components/Toast';
import '../styles/profile.css';
import { useTranslation } from 'react-i18next';

// SVG Icons
const UserIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Password Modal Component
function PasswordModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("profile.validate_required"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("profile.validate_match"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("profile.validate_length"));
      return;
    }

    setLoading(true);
    try {
      await authAPI.updateProfile({
        currentPassword,
        newPassword
      });
      onSuccess();
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || t("profile.msg_password_error"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal passwordModal" onMouseDown={e => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">
            <LockIcon /> {t("profile.modal_change_password")}
          </div>
          <button className="iconBtn" type="button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modalBody">
            {error && <div className="errorMessage">{error}</div>}

            <div className="field">
              <label>{t("profile.label_current_password")}</label>
              <div className="inputRow">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder={t("profile.placeholder_current_password")}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="iconBtn"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="field">
              <label>{t("profile.label_new_password")}</label>
              <div className="inputRow">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t("profile.placeholder_new_password")}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="iconBtn"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="field">
              <label>{t("profile.label_confirm_password")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("profile.placeholder_confirm_password")}
                disabled={loading}
              />
            </div>
          </div>
          <div className="modalActions">
            <button type="button" className="btnGhost" onClick={onClose}>{t("common.cancel")}</button>
            <button type="submit" className="btnPrimary" disabled={loading}>
              {loading ? t("common.processing") : t("common.update")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Sessions Modal Component
function SessionsModal({ open, onClose, sessions }) {
  const { t } = useTranslation();
  if (!open) return null;

  return createPortal(
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal sessionsModal" onMouseDown={e => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">
            <ShieldIcon /> {t("profile.modal_sessions_title")}
          </div>
          <button className="iconBtn" type="button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modalBody">
          <p className="modalDesc">{t("profile.modal_sessions_desc")}</p>
          <div className="sessionsList">
            {sessions.map(session => (
              <div key={session.id} className="sessionRow">
                <div className="sessionIcon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div className="sessionInfo">
                  <div className="sessionDevice">
                    {session.device} {session.isCurrent && <span className="currentBadge">{t("profile.session_current")}</span>}
                  </div>
                  <div className="sessionMeta">
                    {session.location} • {session.ip}
                  </div>
                  <div className="sessionTime">
                    {formatDate(session.time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modalActions">
          <button type="button" className="btnGhost" style={{ color: 'var(--admin-error)' }}>{t("profile.btn_logout_others")}</button>
          <button type="button" className="btnPrimary" onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile data states
  const [stats, setStats] = useState({ todayOrders: 0, todayProducts: 0, todayCustomers: 0 });
  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    loadUserData();
    loadExtraData();
  }, []);

  const loadExtraData = async () => {
    try {
      setLoadingExtra(true);
      const [statsData, sessionsData, activitiesData] = await Promise.all([
        dashboardAPI.getProfileStats(),
        authAPI.getSessions(),
        authAPI.getActivities()
      ]);
      setStats(statsData);
      setSessions(sessionsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load extra profile data:', error);
    } finally {
      setLoadingExtra(false);
    }
  };

  const loadUserData = async () => {
    if (!isLoggedIn()) {
      navigate('/admin/login');
      return;
    }

    try {
      setLoading(true);
      const userData = await authAPI.getMe();
      setUser(userData);
      setEditName(userData.fullName || userData.username || '');
    } catch (error) {
      console.error('Failed to load user:', error);
      showToast(t("profile.msg_load_error"), 'error');
      // If unauthorized, redirect to login
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        logout();
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      showToast(t("profile.validate_name_empty"), 'error');
      return;
    }

    setSavingName(true);
    try {
      await authAPI.updateProfile({ fullName: editName.trim() });
      setUser(prev => ({ ...prev, fullName: editName.trim() }));
      setIsEditingName(false);
      showToast(t("profile.msg_update_name_success"));
    } catch (error) {
      showToast(error.message || t("profile.msg_update_name_error"), 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast(t("products.validate_image_type", "Vui lòng chọn file ảnh (jpg, png, gif, webp)"), 'error');
      return;
    }

    try {
      showToast(t("common.processing"), 'info');
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('fyd_token');
      const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      
      if (uploadData.success && uploadData.url) {
        // Update profile
        await authAPI.updateProfile({ avatarUrl: uploadData.url });
        setUser(prev => ({ ...prev, avatar: uploadData.url }));
        showToast(t("profile.msg_update_name_success"));
      } else {
        throw new Error(uploadData.error || "Upload failed");
      }
    } catch (error) {
      showToast(error.message || t("profile.msg_update_name_error"), 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="admin-profile-page">
        <div className="profile-loading">
          <div className="loadingSpinner"></div>
          <p>{t("common.loading")}...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-profile-page">
        <div className="profile-error">
          <p>{t("profile.msg_load_error")}</p>
          <button className="btnPrimary" onClick={() => navigate('/admin/login')}>
            {t("profile.btn_relogin")}
          </button>
        </div>
      </div>
    );
  }

  const initials = (user.fullName || user.username || 'A').charAt(0).toUpperCase();

  return (
    <div className="admin-profile-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
      />

      {/* Profile Header Card */}
      <div className="profile-header">
        <div className="profile-header-inner">
          <div className="profile-avatar-container" onClick={() => fileInputRef.current?.click()}>
            {user.avatar ? (
              <img src={getAssetUrl(user.avatar)} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-default">{initials}</div>
            )}
            <div className="profile-avatar-overlay">
              <CameraIcon />
              <span>{t("profile.btn_change_avatar")}</span>
            </div>
          </div>

          <div className="profile-header-info">
            <h1 className="profile-name">{user.fullName || user.username}</h1>
            <p className="profile-email">{user.email}</p>
            <p className="profile-role">
              <ShieldIcon />
              {user.role === 'ADMIN' ? t("staff.role_admin") : user.role || t("staff.role_staff")}
            </p>
          </div>

          <div className="profile-header-actions">
            <button className="btnGhost" onClick={handleLogout}>
              {t("header.logout")}
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="profile-content">
        {/* Personal Info Section */}
        <div className="profile-section">
          <div className="section-header">
            <h3><UserIcon /> {t("profile.section_personal")}</h3>
          </div>

          <div className="field">
            <label>{t("profile.label_fullname")}</label>
            {isEditingName ? (
              <div className="edit-field">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  disabled={savingName}
                  autoFocus
                />
                <div className="edit-actions">
                  <button
                    className="btnGhost"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(user.fullName || user.username || '');
                    }}
                    disabled={savingName}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btnPrimary"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? t("common.save") + '...' : t("common.save")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="field-display">
                <span>{user.fullName || user.username || '—'}</span>
                <button className="iconBtn" onClick={() => setIsEditingName(true)}>
                  <EditIcon />
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label>Email</label>
            <div className="field-display readonly">
              <span>{user.email || '—'}</span>
            </div>
          </div>

          <div className="field">
            <label>{t("profile.label_username")}</label>
            <div className="field-display readonly">
              <span>{user.username || '—'}</span>
            </div>
          </div>

          {user.createdAt && (
            <div className="field">
              <label>{t("profile.label_join_date")}</label>
              <div className="field-display readonly">
                <span>{formatDate(user.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="profile-section">
          <div className="section-header">
            <h3><LockIcon /> {t("profile.section_security")}</h3>
          </div>

          <div className="security-item">
            <div className="security-info">
              <h4>{t("profile.label_password")}</h4>
              <p>{t("profile.label_password_desc")}</p>
            </div>
            <button className="btnGhost" onClick={() => setShowPasswordModal(true)}>
              {t("profile.modal_change_password")}
            </button>
          </div>

          <div className="security-item">
            <div className="security-info">
              <h4>{t("profile.label_sessions")}</h4>
              <p>{t("profile.label_sessions_desc")}</p>
            </div>
            <button className="btnGhost" onClick={() => setShowSessionsModal(true)}>
              {t("common.view_details")}
            </button>
          </div>
        </div>

        {/* Activity Section */}
        <div className="profile-section profile-section-full">
          <div className="section-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {t("profile.section_activity")}
            </h3>
          </div>

          <div className="activity-stats">
            <div className="stat-card">
              <div className="stat-value">{stats.todayOrders}</div>
              <div className="stat-label">{t("profile.stat_orders")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.todayProducts}</div>
              <div className="stat-label">{t("profile.stat_products")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.todayCustomers}</div>
              <div className="stat-label">{t("profile.stat_customers")}</div>
            </div>
          </div>

          <div className="activity-log">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'login' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                    ) : activity.type === 'update_profile' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                  </div>
                  <div className="activity-content">
                    <span className="activity-text">{activity.text}</span>
                    <span className="activity-time">{formatDate(activity.time)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-empty">
                <p>{t("profile.empty_activity")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <PasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => showToast(t("profile.msg_password_success"))}
      />

      {/* Sessions Modal */}
      <SessionsModal
        open={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        sessions={sessions}
      />

      {/* Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldAlert, Bell, Key, House, Menu, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Notification, Payment, Project } from '../types';

type NotificationItem =
  | { type: 'payment'; project: Project; payment: Payment; id: string }
  | { type: 'system'; data: Notification; id: string };

const Navbar: React.FC = () => {
  const { currentUser, logout, projects, updateUser, notifications, markNotificationAsRead } = useAppContext();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const unacknowledgedPayments: NotificationItem[] = projects.flatMap(p => 
    p.payments.filter(pay => 
      pay.payerId !== currentUser?.id && 
      !pay.acknowledgedBy?.includes(currentUser?.id || '') &&
      (currentUser?.role === 'admin' || p.partners?.includes(currentUser?.id || ''))
    ).map(pay => ({ type: 'payment', project: p, payment: pay, id: `pay_${pay.id}` }))
  );

  const userNotifications: NotificationItem[] = notifications.filter(n => n.userId === currentUser?.id && !n.isRead).map(n => ({
    type: 'system',
    data: n,
    id: n.id
  }));

  const allNotifications: NotificationItem[] = [...unacknowledgedPayments, ...userNotifications];

  return (
    <nav style={{ 
      background: 'var(--bg-card)', 
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container flex-between" style={{ padding: '0 2rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/f.jpg" alt="Logo" style={{ height: '45px', width: 'auto', filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.5))', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--accent-primary)' }}>شراكة</h2>
            <div style={{ display: 'flex', gap: '2px', color: 'var(--danger)', fontSize: '0.5rem' }}>
              <span>★</span><span>★</span><span>★</span>
            </div>
          </div>
        </Link>

        {currentUser && (
          <>
            {/* Desktop Navigation Items */}
            <div className="nav-desktop-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {currentUser.name.charAt(0)}
                </div>
                <span className="nav-username" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{currentUser.name}</span>
              </div>

              <Link to="/" className="btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="العودة للداشبورد">
                <House size={18} />
              </Link>

              {currentUser.role === 'admin' && (
                <Link to="/admin" className="btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="لوحة التحكم">
                  <ShieldAlert size={18} />
                </Link>
              )}

              {/* Notifications Dropdown Container */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.3s', position: 'relative' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  title="الإشعارات"
                >
                  <Bell size={20} />
                  {allNotifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--danger)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                      {allNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notifications-dropdown" style={{ position: 'absolute', top: '100%', left: 0, width: '300px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, marginTop: '0.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الإشعارات الجديدة</h3>
                    {allNotifications.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>لا توجد إشعارات جديدة</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {allNotifications.map((item) => {
                          if (item.type === 'payment') {
                            return (
                              <Link 
                                key={item.id} 
                                to={`/project/${item.project.id}`}
                                onClick={() => setShowNotifications(false)}
                                style={{ display: 'block', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)' }}
                              >
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                  دفعة جديدة بقيمة <strong style={{ color: 'var(--accent-primary)' }}>{item.payment.amount} {item.project.currency}</strong>
                                </p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>في مشروع: {item.project.title}</p>
                              </Link>
                            );
                          } else {
                            return (
                              <div 
                                key={item.id}
                                style={{ display: 'block', textDecoration: 'none', background: 'rgba(212,175,55,0.1)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', borderLeft: '3px solid var(--accent-primary)' }}
                                onClick={() => {
                                  markNotificationAsRead(item.data.id);
                                  setShowNotifications(false);
                                  if (item.data.projectId) {
                                    window.location.href = `/project/${item.data.projectId}`;
                                  }
                                }}
                              >
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>{item.data.message}</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.data.date).toLocaleDateString()}</p>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowPasswordModal(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.3s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                title="تغيير كلمة المرور"
              >
                <Key size={20} />
              </button>

              <button 
                onClick={logout}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.3s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                title="تسجيل الخروج"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile Navigation Controls */}
            <div className="nav-mobile-controls" style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.3s', position: 'relative' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  title="الإشعارات"
                >
                  <Bell size={20} />
                  {allNotifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--danger)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                      {allNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notifications-dropdown" style={{ position: 'absolute', top: '100%', left: 0, width: '300px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, marginTop: '0.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الإشعارات الجديدة</h3>
                    {allNotifications.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>لا توجد إشعارات جديدة</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {allNotifications.map((item) => {
                          if (item.type === 'payment') {
                            return (
                              <Link 
                                key={item.id} 
                                to={`/project/${item.project.id}`}
                                onClick={() => setShowNotifications(false)}
                                style={{ display: 'block', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)' }}
                              >
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                  دفعة جديدة بقيمة <strong style={{ color: 'var(--accent-primary)' }}>{item.payment.amount} {item.project.currency}</strong>
                                </p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>في مشروع: {item.project.title}</p>
                              </Link>
                            );
                          } else {
                            return (
                              <div 
                                key={item.id}
                                style={{ display: 'block', textDecoration: 'none', background: 'rgba(212,175,55,0.1)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', borderLeft: '3px solid var(--accent-primary)' }}
                                onClick={() => {
                                  markNotificationAsRead(item.data.id);
                                  setShowNotifications(false);
                                  if (item.data.projectId) {
                                    window.location.href = `/project/${item.data.projectId}`;
                                  }
                                }}
                              >
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>{item.data.message}</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.data.date).toLocaleDateString()}</p>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsMenuOpen(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="القائمة"
              >
                <Menu size={24} color="var(--text-primary)" />
              </button>
            </div>

            {/* Mobile Side Drawer Menu */}
            {isMenuOpen && (
              <div 
                className="drawer-overlay"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  zIndex: 2000, display: 'flex', justifyContent: 'flex-start'
                }}
              >
                <div 
                  className="drawer-menu"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: '280px', background: 'var(--bg-secondary)',
                    borderLeft: '1px solid var(--border-color)',
                    padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column',
                    gap: '1.5rem', zIndex: 2001, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    animation: 'slideInRight 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                        {currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{currentUser.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentUser.role === 'admin' ? 'مدير النظام' : 'شريك'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <hr style={{ borderColor: 'var(--border-color)', margin: '0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Link 
                      to="/" 
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-secondary" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem' }}
                    >
                      <House size={18} />
                      <span>الرئيسية (المشاريع)</span>
                    </Link>

                    {currentUser.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMenuOpen(false)}
                        className="btn-secondary" 
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem' }}
                      >
                        <ShieldAlert size={18} />
                        <span>لوحة التحكم الإدارية</span>
                      </Link>
                    )}
                  </div>

                  <hr style={{ borderColor: 'var(--border-color)', margin: 'auto 0 0 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                      onClick={() => { setIsMenuOpen(false); setShowPasswordModal(true); }}
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem' }}
                    >
                      <Key size={18} />
                      <span>تغيير كلمة المرور</span>
                    </button>

                    <button 
                      onClick={() => { setIsMenuOpen(false); logout(); }}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem', background: 'var(--flag-red)', color: 'white', boxShadow: 'none' }}
                    >
                      <LogOut size={18} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} /> تغيير كلمة المرور
            </h3>
            <input 
              type="text" 
              className="input-field" 
              placeholder="أدخل كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  if (newPassword.trim().length > 0) {
                    updateUser(currentUser!.id, { password: newPassword.trim() });
                    alert('تم تغيير كلمة المرور بنجاح!');
                    setShowPasswordModal(false);
                    setNewPassword('');
                  } else {
                    alert('الرجاء إدخال كلمة مرور صالحة');
                  }
                }}
              >
                حفظ
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

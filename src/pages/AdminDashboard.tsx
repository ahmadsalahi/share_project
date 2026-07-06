import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, UserX, UserCheck, ShieldAlert, Trash2, Key } from 'lucide-react';
import type { User } from '../types';

const AdminDashboard: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, projects, deleteProject } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'partners' | 'projects'>('partners');
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) return;
    
    // Check if username exists
    if (users.some(u => u.username === newUserUsername)) {
      setErrorMsg('اسم المستخدم موجود مسبقاً');
      return;
    }

    addUser({
      name: newUserName,
      username: newUserUsername,
      password: newUserPassword,
      role: 'partner',
      isActive: true
    });

    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setErrorMsg(null);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الشريك؟')) {
      const err = deleteUser(id);
      if (err) {
        alert(err);
      }
    }
  };

  const toggleUserActive = (user: User) => {
    if (user.role === 'admin') return; // Cannot deactivate admin this way
    updateUser(user.id, { isActive: !user.isActive });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <ShieldAlert size={32} color="var(--accent-primary)" />
        <h1 style={{ fontSize: '2rem', margin: 0 }}>لوحة تحكم المدير</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={activeTab === 'partners' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('partners')}
        >
          إدارة الشركاء
        </button>
        <button 
          className={activeTab === 'projects' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('projects')}
        >
          إدارة المشاريع
        </button>
      </div>

      {activeTab === 'partners' && (
        <div className="admin-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 2fr' }}>
          
          {/* Add Partner Form */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} /> إضافة شريك جديد
            </h3>
            
            {errorMsg && (
              <div style={{ background: 'rgba(206, 17, 38, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>الاسم الكامل</label>
                <input type="text" className="input-field" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>اسم المستخدم (للدخول)</label>
                <input type="text" className="input-field" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>كلمة المرور</label>
                <input type="password" className="input-field" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                حفظ الشريك
              </button>
            </form>
          </div>

          {/* Partners List */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>قائمة الشركاء</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {users.map(user => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {user.name} 
                      {user.role === 'admin' && <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>مدير</span>}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      اسم المستخدم: {user.username || user.name}
                    </p>
                  </div>
                  
                  {user.role !== 'admin' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => toggleUserActive(user)}
                        className="btn-secondary"
                        style={{ padding: '0.5rem', borderColor: user.isActive ? 'var(--danger)' : 'var(--success)', color: user.isActive ? 'var(--danger)' : 'var(--success)' }}
                        title={user.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                      >
                        {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button 
                        onClick={() => {
                          const newPass = window.prompt(`أدخل كلمة المرور الجديدة للشريك ${user.name}:`);
                          if (newPass && newPass.trim() !== '') {
                            updateUser(user.id, { password: newPass.trim() });
                            alert('تم تعيين كلمة مرور جديدة بنجاح!');
                          }
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.5rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                        title="إعادة تعيين كلمة المرور"
                      >
                        <Key size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn-secondary"
                        style={{ padding: '0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title="حذف نهائي"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'projects' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>إدارة المشاريع والصلاحيات</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            لإضافة مشروع جديد وربط الشركاء، انتقل إلى "لوحة التحكم" الرئيسية واضغط على "مشروع جديد".
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projects.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مشاريع لعرضها.</p>
            ) : (
              projects.map(project => (
                <div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{project.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      الشركاء المرتبطين: {project.partners?.length > 0 
                        ? project.partners.map(pid => users.find(u => u.id === pid)?.name).filter(Boolean).join('، ')
                        : 'الجميع'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm('هل أنت متأكد من حذف هذا المشروع بالكامل بجميع بياناته؟')) {
                        deleteProject(project.id);
                      }
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', borderColor: 'var(--danger)', color: 'var(--danger)', gap: '0.5rem' }}
                  >
                    <Trash2 size={16} /> حذف المشروع
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;

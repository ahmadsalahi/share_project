import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProjectCard from '../components/ProjectCard';
import ProjectModal from '../components/ProjectModal';
import { formatMoney } from '../utils';

const Dashboard: React.FC = () => {
  const { projects, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleProjects = currentUser?.role === 'admin' 
    ? projects 
    : projects.filter(p => p.partners && p.partners.includes(currentUser?.id || ''));

  const totalsByCurrency = visibleProjects.reduce((acc, project) => {
    const sum = project.payments.reduce((s, p) => s + p.amount, 0);
    const curr = project.currency || 'USD';
    acc[curr] = (acc[curr] || 0) + sum;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>لوحة التحكم</h1>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            إجمالي الاستثمارات: 
            {Object.entries(totalsByCurrency).length === 0 ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>0</span>
            ) : (
              Object.entries(totalsByCurrency).map(([curr, amount]) => (
                <span key={curr} style={{ color: 'var(--text-primary)', fontWeight: 'bold', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                  {formatMoney(amount, curr as any)}
                </span>
              ))
            )}
          </div>
        </div>
        {currentUser && (
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            مشروع جديد
          </button>
        )}
      </div>

      {visibleProjects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Plus size={40} color="var(--text-secondary)" />
          </div>
          <h2 style={{ marginBottom: '1rem' }}>لا توجد مشاريع حالياً</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {currentUser?.role === 'admin' 
              ? 'ابدأ بإضافة مشروع جديد.' 
              : 'لم يتم ربطك بأي مشروع بعد، يمكنك إنشاء مشروع خاص أو طلب مشاركة.'}
          </p>
          {currentUser?.role === 'admin' && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              إضافة أول مشروع
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {visibleProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Dashboard;

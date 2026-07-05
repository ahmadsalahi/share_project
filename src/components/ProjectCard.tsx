import React from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, PieChart, Trash2 } from 'lucide-react';
import { formatMoney } from '../utils';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { users, currentUser, deleteProject } = useAppContext();
  const totalAmount = project.payments.reduce((sum, p) => sum + p.amount, 0);

  const partnerIds = project.partnerShares
    ? Object.keys(project.partnerShares)
    : project.partners.length > 0
      ? project.partners
      : [];

  const partnerInfo = partnerIds.length > 0
    ? partnerIds.map(id => ({
        id,
        name: users.find(u => u.id === id)?.name || 'غير معروف',
        percent: project.partnerShares?.[id] ?? (project.partners.length === 2 ? (id === project.partners[0] ? project.targetSplit : 100 - project.targetSplit) : Math.round(100 / partnerIds.length))
      }))
    : [{ id: 'unknown', name: 'غير معروف', percent: 100 }];

  const progressStyles = partnerInfo.slice(0, 3).map((info, idx) => ({
    width: `${info.percent}%`,
    background: idx === 0 ? 'var(--accent-gradient)' : idx === 1 ? 'var(--success)' : 'rgba(255,255,255,0.12)',
    height: '100%',
    transition: 'width 0.5s ease'
  }));

  const canDeleteProject = currentUser?.role === 'admin' || (Boolean(project.isPrivate) && currentUser?.id === project.ownerId);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('هل تريد حذف هذا المشروع؟')) {
      deleteProject(project.id);
    }
  };

  return (
    <Link to={`/project/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.3s ease', cursor: 'pointer' }} 
           onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
           onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={20} className="text-gradient" />
            {project.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canDeleteProject && (
              <button
                type="button"
                onClick={handleDelete}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem', borderRadius: '6px' }}
                title="حذف المشروع"
              >
                <Trash2 size={18} />
              </button>
            )}
            <ArrowLeft size={20} color="var(--text-secondary)" />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>إجمالي الاستثمار</p>
          <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatMoney(totalAmount, project.currency)}</h4>
        </div>

        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {partnerInfo.map(info => (
              <span key={info.id}>{info.name}: {info.percent}%</span>
            ))}
          </div>

          <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
            {progressStyles.map((style, idx) => (
              <div key={idx} style={style} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, Trash2, Calendar, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProjectStepModal from '../components/ProjectStepModal';
import StepDetailsModal from '../components/StepDetailsModal';
import type { ProjectStep } from '../types';

const ProjectSteps: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, currentUser, deleteProjectStep } = useAppContext();
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProjectStep | null>(null);

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>المشروع غير موجود</h2>
        <Link to="/" className="btn-secondary" style={{ marginTop: '1rem' }}>العودة للوحة التحكم</Link>
      </div>
    );
  }

  const rawSteps = project.steps;
  const steps = [...(Array.isArray(rawSteps) ? rawSteps : [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const completion = project.completionPercentage || 0;
  const totalSteps = steps.length;
  const canManageSteps = currentUser?.role === 'admin' || project.partners?.includes(currentUser?.id || '');

  // Determine step status: done = first X steps based on completion %, current = next one, rest pending
  const doneCount = totalSteps === 0 ? 0 : Math.floor((completion / 100) * totalSteps);
  const hasCurrentStep = doneCount < totalSteps && completion > 0;

  const getStepStatus = (index: number): 'done' | 'current' | 'pending' => {
    if (index < doneCount) return 'done';
    if (hasCurrentStep && index === doneCount) return 'current';
    return 'pending';
  };

  const statusColor = { done: 'var(--success)', current: 'var(--accent-primary)', pending: 'var(--border-color)' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link
          to={`/project/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem' }}
        >
          <ArrowRight size={18} /> العودة لتفاصيل المشروع
        </Link>

        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: '0 0 0.25rem 0' }}>مراحل المشروع</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{project.title}</p>
          </div>
          {canManageSteps && (
            <button className="btn-primary" onClick={() => setIsStepModalOpen(true)} style={{ gap: '0.5rem' }}>
              <Plus size={20} /> إضافة مرحلة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Completion Hero Card */}
      <div className="glass-panel" style={{
        padding: '2.5rem',
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(0,122,61,0.08) 100%)',
        border: '1px solid rgba(212,175,55,0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative bg circle */}
        <div style={{ position: 'absolute', left: '-60px', top: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {/* Circle gauge */}
          <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle
                cx="65" cy="65" r="55" fill="none"
                stroke="url(#grad)" strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 55}`}
                strokeDashoffset={`${2 * Math.PI * 55 * (1 - completion / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#007a3d" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{completion}%</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>نسبة الإنجاز الكلية</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
              تم إنجاز {completion}% من أعمال المشروع حتى الآن
            </p>
            {/* Linear bar */}
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                width: `${completion}%`, height: '100%',
                background: 'linear-gradient(90deg, #d4af37, #007a3d)',
                borderRadius: '5px', transition: 'width 1s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>0%</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{completion}% مكتمل</span>
              <span>100%</span>
            </div>
          </div>

          {/* Steps count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '130px' }}>
            {[
              { label: 'مكتملة', count: steps.filter((_, i) => getStepStatus(i) === 'done').length, color: 'var(--success)' },
              { label: 'جارية', count: steps.filter((_, i) => getStepStatus(i) === 'current').length, color: 'var(--accent-primary)' },
              { label: 'قادمة', count: steps.filter((_, i) => getStepStatus(i) === 'pending').length, color: 'var(--text-secondary)' },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stat.label}</span>
                <span style={{ fontWeight: 'bold', color: stat.color, fontSize: '1.1rem' }}>{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {steps.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>لا توجد مراحل مضافة لهذا المشروع بعد.</p>
          {canManageSteps && (
            <button className="btn-primary" onClick={() => setIsStepModalOpen(true)} style={{ marginTop: '1.5rem' }}>
              <Plus size={18} /> أضف أول مرحلة
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative', paddingRight: '2rem' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', right: '11px', top: '24px',
            width: '2px',
            height: `calc(100% - 48px)`,
            background: 'linear-gradient(to bottom, var(--accent-primary), var(--border-color))',
            opacity: 0.4
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {steps.map((step, idx) => {
              const status = getStepStatus(idx);
              return (
                <div key={step.id} style={{ position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', right: '-2rem', top: '1.4rem',
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    background: status === 'done' ? 'var(--success)' : status === 'current' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    border: `3px solid ${statusColor[status]}`,
                    boxShadow: status !== 'pending' ? `0 0 12px ${statusColor[status]}55` : 'none',
                    transition: 'all 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {status === 'done' && <CheckCircle size={14} color="white" />}
                    {status === 'current' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                  </div>

                  {/* Card */}
                  <div style={{
                    background: status === 'done' ? 'rgba(0,122,61,0.07)' : status === 'current' ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${status === 'pending' ? 'var(--border-color)' : statusColor[status] + '44'}`,
                    padding: '1.5rem',
                    borderRadius: '14px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '20px',
                            background: status === 'done' ? 'rgba(0,122,61,0.2)' : status === 'current' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.07)',
                            color: statusColor[status]
                          }}>
                            {status === 'done' ? '✓ مكتملة' : status === 'current' ? '⟳ جارية' : '◷ قادمة'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={13} /> {step.date}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: status === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {step.title}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {step.images?.length > 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ImageIcon size={14} /> {step.images.length}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedStep(step)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                        >
                          التفاصيل
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من حذف هذه المرحلة؟')) {
                                deleteProjectStep(project.id, step.id);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {step.description && (
                      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', fontSize: '0.9rem' }}>
                        {step.description}
                      </p>
                    )}

                    {/* Image previews */}
                    {step.images?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        {step.images.slice(0, 4).map((img, i) => (
                          <img
                            key={i} src={img}
                            alt="" onClick={() => setSelectedStep(step)}
                            style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'transform 0.2s' }}
                            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        ))}
                        {step.images.length > 4 && (
                          <div
                            onClick={() => setSelectedStep(step)}
                            style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}
                          >
                            +{step.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProjectStepModal isOpen={isStepModalOpen} onClose={() => setIsStepModalOpen(false)} projectId={project.id} />
      <StepDetailsModal isOpen={!!selectedStep} onClose={() => setSelectedStep(null)} step={selectedStep} />
    </div>
  );
};

export default ProjectSteps;

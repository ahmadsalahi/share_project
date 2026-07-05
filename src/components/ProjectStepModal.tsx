import React, { useState, useRef } from 'react';
import { X, Upload, XCircle, Activity, Calendar, FileText, Percent } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ProjectStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const ProjectStepModal: React.FC<ProjectStepModalProps> = ({ isOpen, onClose, projectId }) => {
  const { updateProject, projects, addNotification } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const project = projects.find(p => p.id === projectId);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [completionPercentage, setCompletionPercentage] = useState<number>(project?.completionPercentage || 0);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen || !project) return null;

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة يجب أن لا يتجاوز 5 ميغابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('الرجاء إدخال عنوان المرحلة');
      return;
    }

    if (completionPercentage < 0 || completionPercentage > 100) {
      setError('نسبة الإنجاز يجب أن تكون بين 0 و 100');
      return;
    }

    // Combine step + completion% into ONE atomic update to avoid React state batching issues
    const newStep = {
      id: `step_${Date.now()}`,
      title,
      description,
      date,
      images,
    };

    // We call updateProject with both the new step AND the new percentage in one shot
    updateProject(projectId, {
      completionPercentage,
      steps: [...(Array.isArray(project.steps) ? project.steps : []), newStep],
    });

    // Send notifications to all partners
    if (project.partners) {
      project.partners.forEach(partnerId => {
        addNotification({
          userId: partnerId,
          message: `تم إضافة تحديث جديد "${title}" في مشروع ${project.title}`,
          projectId: project.id
        });
      });
    }

    // Reset and close
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setImages([]);
    setCompletionPercentage(project?.completionPercentage || 0);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>إضافة تحديث جديد</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{project.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ background: 'rgba(206,17,38,0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.9rem', border: '1px solid rgba(206,17,38,0.2)' }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <FileText size={14} /> عنوان المرحلة
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="مثال: صب السقف، حفر الأساسات..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <FileText size={14} /> الوصف (تفاصيل الإنجاز)
            </label>
            <textarea
              className="input-field"
              placeholder="أدخل تفاصيل المرحلة..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Date & Percentage - side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Calendar size={14} /> تاريخ الإنجاز
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Percent size={14} /> نسبة الإنجاز الكلية
              </label>
              {/* Slider + number input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={completionPercentage}
                    onChange={e => setCompletionPercentage(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.1rem', minWidth: '40px', textAlign: 'left' }}>
                    {completionPercentage}%
                  </span>
                </div>
                {/* Visual bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${completionPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #d4af37, #007a3d)', transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>الحالية: {project.completionPercentage || 0}%</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>جديدة: {completionPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <Upload size={14} /> إرفاق صور (اختياري)
            </label>
            <div
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                padding: '1.5rem',
                textAlign: 'center',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: isDragging ? 'rgba(212,175,55,0.05)' : 'rgba(0,0,0,0.2)'
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={28} style={{ margin: '0 auto 0.5rem', color: isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)', display: 'block' }} />
              <p style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                {isDragging ? 'أفلت الصور هنا' : 'اضغط لاختيار أو اسحب الصور هنا'}
              </p>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>PNG, JPG, WEBP — الحد الأقصى 5 ميغابايت</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
            </div>

            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '72px', height: '72px' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--border-color)' }} />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--bg-secondary)', borderRadius: '50%', color: 'var(--danger)', padding: 0, border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.85rem' }}>
              حفظ التحديث
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.85rem 1.5rem' }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
};

export default ProjectStepModal;

import React, { useState } from 'react';
import { X, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import type { ProjectStep } from '../types';

interface StepDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: ProjectStep | null;
}

const StepDetailsModal: React.FC<StepDetailsModalProps> = ({ isOpen, onClose, step }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !step) return null;

  const handleNextImage = () => {
    if (step.images && currentImageIndex < step.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  // Reset image index when step changes or modal opens
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [step, isOpen]);

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)', fontSize: '1.5rem' }}>{step.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Calendar size={16} />
              <span>تاريخ الإنجاز: {step.date}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {step.description && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '2px solid var(--accent-primary)', display: 'inline-block', paddingBottom: '0.25rem' }}>التفاصيل والملاحظات</h3>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {step.description}
              </p>
            </div>
          )}

          {step.images && step.images.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '2px solid var(--accent-primary)', display: 'inline-block', paddingBottom: '0.25rem' }}>المعرض ({step.images.length} صور)</h3>
              
              <div style={{ position: 'relative', width: '100%', height: '400px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={step.images[currentImageIndex]} 
                  alt={`Step image ${currentImageIndex + 1}`} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
                
                {step.images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      disabled={currentImageIndex === 0}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.5rem', cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === 0 ? 0.3 : 1 }}
                    >
                      <ChevronRight size={32} />
                    </button>
                    
                    <button 
                      onClick={handleNextImage}
                      disabled={currentImageIndex === step.images.length - 1}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.5rem', cursor: currentImageIndex === step.images.length - 1 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === step.images.length - 1 ? 0.3 : 1 }}
                    >
                      <ChevronLeft size={32} />
                    </button>
                    
                    <div style={{ position: 'absolute', bottom: '15px', background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
                      {currentImageIndex + 1} / {step.images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {step.images.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {step.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setCurrentImageIndex(idx)}
                      style={{ 
                        width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                        border: currentImageIndex === idx ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        opacity: currentImageIndex === idx ? 1 : 0.6,
                        transition: 'all 0.3s'
                      }}
                    >
                      <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default StepDetailsModal;

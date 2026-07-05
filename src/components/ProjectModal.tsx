import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

import type { Currency } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { addProject, addNotification, users, currentUser } = useAppContext();
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [partnerPercents, setPartnerPercents] = useState<Record<string, number>>({});
  const [shareRequestPartners, setShareRequestPartners] = useState<string[]>([]);
  const [shareRequestPercents, setShareRequestPercents] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const computeEqualPercents = (ids: string[]) => {
    if (!ids || ids.length === 0) return {} as Record<string, number>;
    const len = ids.length;
    const base = Math.floor(100 / len);
    const remainder = 100 - base * len;
    const res: Record<string, number> = {};
    ids.forEach((id, idx) => {
      res[id] = base + (idx < remainder ? 1 : 0);
    });
    return res;
  };

  const handlePercentChange = (id: string, value: number) => {
    const v = Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value));
    const others = selectedPartners.filter(pid => pid !== id);
    const newPercents: Record<string, number> = { [id]: v };
    if (others.length === 0) {
      setPartnerPercents(newPercents);
      return;
    }

    const remaining = Math.max(0, 100 - v);
    const base = Math.floor(remaining / others.length);
    const rem = remaining - base * others.length;
    others.forEach((oid, idx) => {
      newPercents[oid] = base + (idx < rem ? 1 : 0);
    });
    setPartnerPercents(newPercents);
  };

  const handleShareRequestPercentChange = (id: string, value: number) => {
    const v = Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value));
    const others = shareRequestPartners.filter(pid => pid !== id);
    const newPercents: Record<string, number> = { [id]: v };
    if (others.length === 0) {
      setShareRequestPercents(newPercents);
      return;
    }

    const remaining = Math.max(0, 100 - v);
    const base = Math.floor(remaining / others.length);
    const rem = remaining - base * others.length;
    others.forEach((oid, idx) => {
      newPercents[oid] = base + (idx < rem ? 1 : 0);
    });
    setShareRequestPercents(newPercents);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    const defaultPartners = users.filter(u => u.role === 'partner').map(u => u.id);
    const selectedList = selectedPartners.length > 0 ? selectedPartners : defaultPartners;
    const creatorId = currentUser.id;
    const partnersList = isPrivate
      ? [creatorId]
      : Array.from(new Set([...selectedList, creatorId]));

    // If we have explicit partner percentages, validate they sum to 100
    const hasPercents = partnersList.some(id => partnerPercents[id] !== undefined);
    if (hasPercents) {
      const sum = partnersList.reduce((s, id) => s + (partnerPercents[id] || 0), 0);
      if (sum !== 100) {
        setFormError('مجموع نسب الشركاء يجب أن يساوي 100%');
        return;
      }
    }

    const partnerShares: Record<string, number> = partnersList.length > 0
      ? (hasPercents
        ? partnersList.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: partnerPercents[id] ?? 0 }), {})
        : computeEqualPercents(partnersList))
      : {};

    const computedTargetSplit = partnersList.length > 0
      ? (partnerShares[partnersList[0]] ?? Math.round(100 / partnersList.length))
      : 50;

    const shareRequests = isPrivate && shareRequestPartners.length > 0
      ? shareRequestPartners.map(userId => ({
          userId,
          percent: shareRequestPercents[userId] ?? Math.round(100 / shareRequestPartners.length),
          status: 'pending' as const
        }))
      : [];

    const projectId = addProject({
      title: title.trim(),
      currency,
      targetSplit: Number(computedTargetSplit),
      ownerId: creatorId,
      partners: partnersList,
      partnerShares,
      isPrivate,
      shareRequests
    });

    if (shareRequests.length > 0) {
      shareRequests.forEach(req => {
        addNotification({
          userId: req.userId,
          projectId,
          senderId: creatorId,
          requestedPercent: req.percent,
          type: 'share-request',
          message: `${currentUser.name} طلب مشاركة مشروع "${title}" بنسبة ${req.percent}%`
        });
      });
    }

    setTitle('');
    setCurrency('USD');
    setIsPrivate(false);
    setSelectedPartners([]);
    setPartnerPercents({});
    setShareRequestPartners([]);
    setShareRequestPercents({});
    setFormError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={24} className="text-gradient" />
          إضافة مشروع جديد
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>اسم المشروع (عقار، سيارة، إلخ)</label>
            <input 
              type="text" 
              className="input-field" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل اسم المشروع"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>عملة المشروع</label>
            <select 
              className="input-field" 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              required
              style={{ appearance: 'none' }}
            >
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="SYP">ليرة سورية (SYP)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="EUR">يورو (EUR)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => {
                  setIsPrivate(e.target.checked);
                  if (e.target.checked) {
                    setSelectedPartners([]);
                    setPartnerPercents({});
                  } else {
                    setShareRequestPartners([]);
                    setShareRequestPercents({});
                  }
                }}
              />
              مشروع خاص
            </label>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>بدون شركاء حتى تطلب المشاركة لاحقاً</span>
          </div>

          {isPrivate ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>طلب مشاركة المشروع مع الشركاء</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {users.filter(u => u.role === 'partner' && u.id !== currentUser?.id).map(user => {
                  const checked = shareRequestPartners.includes(user.id);
                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newSelected = e.target.checked
                              ? [...shareRequestPartners, user.id]
                              : shareRequestPartners.filter(id => id !== user.id);
                            setShareRequestPartners(newSelected);
                            setShareRequestPercents(newSelected.length > 0 ? computeEqualPercents(newSelected) : {});
                          }}
                        />
                        <span>{user.name}</span>
                      </label>

                      {checked && (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={shareRequestPercents[user.id] ?? 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            handleShareRequestPercentChange(user.id, v);
                          }}
                          className="input-field"
                          style={{ width: '90px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                اختر الشركاء الذين تريد إرسال طلب مشاركة لهم، وسيتم توزيع النسبة تلقائياً.
              </p>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>الشركاء المشاركين في المشروع</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {users.filter(u => u.role === 'partner').map(user => {
                  const checked = selectedPartners.includes(user.id);
                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newSelected = e.target.checked
                              ? [...selectedPartners, user.id]
                              : selectedPartners.filter(id => id !== user.id);
                            setSelectedPartners(newSelected);
                            setPartnerPercents(newSelected.length > 0 ? computeEqualPercents(newSelected) : {});
                          }}
                        />
                        <span>{user.name}</span>
                      </label>

                      {checked && (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={partnerPercents[user.id] ?? 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            handlePercentChange(user.id, v);
                          }}
                          className="input-field"
                          style={{ width: '90px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                إذا تركتها فارغة، سيتم إضافة جميع الشركاء تلقائياً.
              </p>
            </div>
          )}

          {formError && (
            <div style={{ background: 'rgba(206,17,38,0.08)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px' }}>{formError}</div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            إنشاء المشروع
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;

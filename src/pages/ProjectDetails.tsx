import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, Trash2, Calendar, FileText, Image as ImageIcon, Printer, Check, Eye, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import PaymentModal from '../components/PaymentModal';
import ProjectStepModal from '../components/ProjectStepModal';
import StepDetailsModal from '../components/StepDetailsModal';
import { formatMoney } from '../utils';
import type { Payment, ProjectStep } from '../types';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, users, currentUser, deletePayment, acknowledgePayment, respondToShareRequest, markNotificationAsRead, notifications, deleteProject } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<ProjectStep | null>(null);

  // Printing State
  const [printData, setPrintData] = useState<{ type: 'invoice' | 'report', payload: any } | null>(null);

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>المشروع غير موجود</h2>
        <Link to="/" className="btn-secondary" style={{ marginTop: '1rem' }}>العودة للوحة التحكم</Link>
      </div>
    );
  }

  // Determine the two partners for this project
  const projectPartners = project.partners?.length >= 2 
    ? [users.find(u => u.id === project.partners[0]), users.find(u => u.id === project.partners[1])]
    : users.filter(u => u.role === 'partner').slice(0, 2);

  const user1 = projectPartners[0] || { id: 'unknown_1', name: 'الشريك الأول' };
  const user2 = projectPartners[1] || { id: 'unknown_2', name: 'الشريك الثاني' };

  const totalAmount = project.payments.reduce((sum, p) => sum + p.amount, 0);
  
  const user1Amount = project.payments.filter(p => p.payerId === user1.id).reduce((sum, p) => sum + p.amount, 0);
  const user2Amount = project.payments.filter(p => p.payerId === user2.id).reduce((sum, p) => sum + p.amount, 0);
  
  const user1Percentage = totalAmount === 0 ? 0 : (user1Amount / totalAmount) * 100;
  const user2Percentage = totalAmount === 0 ? 0 : 100 - user1Percentage;

  const shares = project.partnerShares || {};
  const targetUser1Percentage = shares[project.partners?.[0] || ''] ?? project.targetSplit;
  const targetUser2Percentage = shares[project.partners?.[1] || ''] ?? (100 - project.targetSplit);

  const user1TargetAmount = (totalAmount * targetUser1Percentage) / 100;
  const user1Owes = Math.max(0, user1TargetAmount - user1Amount);
  
  const user2TargetAmount = (totalAmount * targetUser2Percentage) / 100;
  const user2Owes = Math.max(0, user2TargetAmount - user2Amount);

  const canDeletePayment = (payerId: string) => {
    return currentUser?.role === 'admin' || currentUser?.id === payerId;
  };

  const canManageSteps = currentUser?.role === 'admin' || project.partners?.includes(currentUser?.id || '');
  const canDeleteCurrentProject = currentUser?.role === 'admin' || (Boolean(project.isPrivate) && currentUser?.id === project.ownerId);

  const pendingShareRequest = project.shareRequests?.find(r => r.userId === currentUser?.id && r.status === 'pending');

  const handleShareRequestResponse = (accepted: boolean) => {
    if (!currentUser || !pendingShareRequest) return;
    respondToShareRequest(project.id, currentUser.id, accepted);

    const relatedNotification = notifications.find(n =>
      n.userId === currentUser.id &&
      n.projectId === project.id &&
      n.type === 'share-request' &&
      !n.isRead
    );
    if (relatedNotification) {
      markNotificationAsRead(relatedNotification.id);
    }
  };

  const handlePrintInvoice = (payment: Payment, payerName: string) => {
    setPrintData({ type: 'invoice', payload: { payment, payerName } });
    setTimeout(() => window.print(), 100);
  };

  const handlePrintReport = (filterPayerId?: string) => {
    let filteredPayments = [...project.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let title = `تقرير شامل - ${project.title}`;

    if (filterPayerId) {
      filteredPayments = filteredPayments.filter(p => p.payerId === filterPayerId);
      title = `تقرير دفعات الشريك: ${users.find(u => u.id === filterPayerId)?.name} - ${project.title}`;
    }

    setPrintData({ type: 'report', payload: { payments: filteredPayments, title } });
    setTimeout(() => window.print(), 100);
  };

  return (
    <div>
      {/* --- PRINTABLE AREA --- */}
      {printData && (
        <div className="print-area" style={{ padding: '2rem', direction: 'rtl', fontFamily: 'Arial, sans-serif' }}>
          
          {/* Print Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem' }}>نظام الشراكة المالية</h1>
              <p style={{ margin: '0.25rem 0 0 0', color: '#555' }}>توثيق المعاملات المالية المشتركة</p>
            </div>
            <img src="/f.jpg" alt="Logo" style={{ height: '80px', borderRadius: '50%' }} />
          </div>

          {/* INVOICE VIEW */}
          {printData.type === 'invoice' && (
            <div>
              <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem', textDecoration: 'underline' }}>سند استلام / فاتورة دفعة</h2>
              
              <div style={{ background: '#f9f9f9', padding: '2rem', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>رقم المرجع: {printData.payload.payment.id}</span>
                  <span style={{ fontSize: '1.2rem' }}>التاريخ: {printData.payload.payment.date}</span>
                </div>

                <div style={{ fontSize: '1.25rem', lineHeight: '2' }}>
                  <p><strong>المشروع:</strong> {project.title}</p>
                  <p><strong>استلمنا من السيد/ة:</strong> {printData.payload.payerName}</p>
                  <p><strong>مبلغاً وقدره:</strong> {formatMoney(printData.payload.payment.amount, project.currency)}</p>
                  {printData.payload.payment.notes && (
                    <p><strong>وذلك لقاء:</strong> {printData.payload.payment.notes}</p>
                  )}
                </div>

                <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold' }}>توقيع المستلم</p>
                    <p>_______________________</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold' }}>توقيع الدافع</p>
                    <p>_______________________</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT VIEW */}
          {printData.type === 'report' && (
            <div>
              <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '1rem' }}>{printData.payload.title}</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.1rem' }}>
                <span><strong>تاريخ التقرير:</strong> {new Date().toLocaleDateString('ar-SA')}</span>
                <span><strong>إجمالي المبلغ بالتقرير:</strong> {formatMoney(printData.payload.payments.reduce((s: number, p: Payment) => s + p.amount, 0), project.currency)}</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: '1rem', border: '1px solid #ccc' }}>التاريخ</th>
                    <th style={{ padding: '1rem', border: '1px solid #ccc' }}>الشريك الدافع</th>
                    <th style={{ padding: '1rem', border: '1px solid #ccc' }}>البيان (ملاحظات)</th>
                    <th style={{ padding: '1rem', border: '1px solid #ccc' }}>المبلغ ({project.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.payload.payments.map((p: Payment) => (
                    <tr key={p.id}>
                      <td style={{ padding: '1rem', border: '1px solid #ccc' }}>{p.date}</td>
                      <td style={{ padding: '1rem', border: '1px solid #ccc' }}>{users.find(u => u.id === p.payerId)?.name || 'غير معروف'}</td>
                      <td style={{ padding: '1rem', border: '1px solid #ccc' }}>{p.notes || '-'}</td>
                      <td style={{ padding: '1rem', border: '1px solid #ccc', fontWeight: 'bold' }}>{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.9rem', color: '#777' }}>
                -- تم استخراج هذا التقرير من نظام الشراكة المالية تلقائياً --
              </div>
            </div>
          )}
        </div>
      )}
      {/* --- END PRINTABLE AREA --- */}

      <div className="no-print">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem' }}>
            <ArrowRight size={20} />
            العودة للمشاريع
          </Link>
          <div className="flex-between page-header">
            <div>
              <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{project.title}</h1>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handlePrintReport()} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}><Printer size={14} /> طباعة جميع الدفعات</button>
                <button onClick={() => handlePrintReport(user1.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}><Printer size={14} /> طباعة دفعات {user1.name}</button>
                <button onClick={() => handlePrintReport(user2.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}><Printer size={14} /> طباعة دفعات {user2.name}</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(currentUser?.role === 'admin' || project.partners?.includes(currentUser?.id || '')) && (
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                  <Plus size={20} />
                  إضافة دفعة
                </button>
              )}
              {canDeleteCurrentProject && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    if (window.confirm('هل تريد حذف هذا المشروع؟')) {
                      deleteProject(project.id);
                      window.location.href = '/';
                    }
                  }}
                  style={{ color: 'var(--danger)', borderColor: 'transparent' }}
                >
                  <Trash2 size={18} />
                  حذف المشروع
                </button>
              )}
            </div>
          </div>
        </div>

        {pendingShareRequest && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)', background: 'rgba(212,175,55,0.08)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem' }}>طلب مشاركة جديد</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
              لقد تلقيت طلب مشاركة في المشروع بنسبة <strong>{pendingShareRequest.percent}%</strong>. يمكنك الاطلاع على المشروع ثم الموافقة أو الرفض.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => handleShareRequestResponse(true)}
                style={{ padding: '0.75rem 1.2rem' }}
              >
                قبول المشاركة
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleShareRequestResponse(false)}
                style={{ padding: '0.75rem 1.2rem' }}
              >
                رفض المشاركة
              </button>
            </div>
          </div>
        )}

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>إجمالي الاستثمار</p>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }} className="text-gradient">
              {formatMoney(totalAmount, project.currency)}
            </h2>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>حالة الشراكة</h3>
            
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>
                {user1.name}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.35rem' }}>({targetUser1Percentage}%)</span>
              </span>
              <span>{formatMoney(user1Amount, project.currency)} ({user1Percentage.toFixed(1)}%)</span>
            </div>
            
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem', display: 'flex' }}>
              <div style={{ width: `${user1Percentage}%`, background: 'var(--accent-gradient)', height: '100%', transition: 'width 0.5s ease' }}></div>
            </div>

            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>
                {user2.name}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.35rem' }}>({targetUser2Percentage}%)</span>
              </span>
              <span>{formatMoney(user2Amount, project.currency)} ({user2Percentage.toFixed(1)}%)</span>
            </div>
            
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${user2Percentage}%`, background: 'var(--success)', height: '100%', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>الموازنة للوصول لـ {targetUser1Percentage}/{targetUser2Percentage}</h3>
            {totalAmount === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد دفعات بعد.</p>
            ) : user1Owes > 0 ? (
              <div>
                <p style={{ marginBottom: '0.5rem' }}>يجب على <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{user1.name}</span> دفع:</p>
                <h3 style={{ fontSize: '2rem', color: 'var(--danger)' }}>{formatMoney(user1Owes, project.currency)}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>للوصول للنسبة المستهدفة</p>
              </div>
            ) : user2Owes > 0 ? (
              <div>
                <p style={{ marginBottom: '0.5rem' }}>يجب على <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{user2.name}</span> دفع:</p>
                <h3 style={{ fontSize: '2rem', color: 'var(--danger)' }}>{formatMoney(user2Owes, project.currency)}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>للوصول للنسبة المستهدفة</p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                الشراكة متوازنة حالياً 🎉
              </div>
            )}
          </div>
        </div>

        {/* --- PROJECT PROGRESS SECTION (Compact) --- */}
        <div className="glass-panel" style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(0,122,61,0.06) 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
        }}>
          <div className="progress-section" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>

            {/* Circular gauge */}
            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
              <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="45" cy="45" r="36" fill="none"
                  stroke="url(#progressGrad)" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - (project.completionPercentage || 0) / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#007a3d" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{project.completionPercentage || 0}%</span>
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
                تطور إنجاز المشروع
              </h3>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {project.steps?.length ? `${project.steps.length} مرحلة مسجلة` : 'لا توجد مراحل بعد'}
              </p>
              {/* Mini bar */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${project.completionPercentage || 0}%`, height: '100%', background: 'linear-gradient(90deg,#d4af37,#007a3d)', transition: 'width 1s ease' }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
              <Link
                to={`/project/${project.id}/steps`}
                className="btn-primary"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', gap: '0.4rem', textDecoration: 'none' }}
              >
                عرض كل المراحل
              </Link>
              {canManageSteps && (
                <button
                  className="btn-secondary"
                  onClick={() => setIsStepModalOpen(true)}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', gap: '0.4rem' }}
                >
                  <Plus size={16} /> إضافة تحديث
                </button>
              )}
            </div>
          </div>
        </div>
        {/* --- END PROJECT PROGRESS SECTION --- */}

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>سجل الدفعات</h3>
          
          {project.payments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>لا توجد أي دفعات مسجلة.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...project.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
                const payer = users.find(u => u.id === payment.payerId);
                const isUser1 = payer?.id === user1.id;
                const otherPartner = payer?.id === user1.id ? user2 : user1;
                
                const isAcknowledgedByMe = payment.acknowledgedBy?.includes(currentUser?.id || '');
                const isAcknowledgedByOther = payment.acknowledgedBy?.includes(otherPartner.id);

                return (
                  <div key={payment.id} className="payment-row" style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid var(--border-color)', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '12px', 
                        background: isUser1 ? 'var(--accent-gradient)' : 'rgba(16, 185, 129, 0.2)',
                        color: isUser1 ? 'white' : 'var(--success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '1.2rem'
                      }}>
                        {payer?.name ? payer.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{payer?.name || 'مستخدم محذوف'}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {payment.date}</span>
                          {payment.notes && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={14} /> {payment.notes}</span>}
                          
                          {/* Acknowledgment Status */}
                          {payer?.id === currentUser?.id ? (
                            isAcknowledgedByOther ? (
                              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={`تم الاطلاع من قبل ${otherPartner.name}`}>
                                <Eye size={14} /> شريكك اطّلع عليها
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                بانتظار اطلاع الشريك
                              </span>
                            )
                          ) : (
                            !isAcknowledgedByMe ? (
                              <button 
                                onClick={() => acknowledgePayment(project.id, payment.id, currentUser!.id)}
                                style={{ background: 'var(--accent-primary)', color: 'black', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                              >
                                <Check size={12} /> أؤكد اطلاعي
                              </button>
                            ) : (
                              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={14} /> لقد قمت بالاطلاع
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '1.25rem' }}>
                        {formatMoney(payment.amount, project.currency)}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handlePrintInvoice(payment, payer?.name || 'مجهول')}
                          className="btn-secondary" 
                          style={{ padding: '8px', borderRadius: '8px', color: 'var(--accent-primary)', borderColor: 'transparent' }}
                          title="طباعة فاتورة"
                        >
                          <Printer size={18} />
                        </button>

                        {payment.receiptDataUrl && (
                          <button 
                            onClick={() => setSelectedImage(payment.receiptDataUrl!)}
                            className="btn-secondary" 
                            style={{ padding: '8px', borderRadius: '8px' }}
                            title="عرض الإيصال المرفق"
                          >
                            <ImageIcon size={18} />
                          </button>
                        )}
                        
                        {canDeletePayment(payment.payerId) && (
                          <button 
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
                                deletePayment(project.id, payment.id);
                              }
                            }}
                            className="btn-secondary" 
                            style={{ padding: '8px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'transparent' }}
                            title="حذف الدفعة"
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} projectId={project.id} />
        <ProjectStepModal isOpen={isStepModalOpen} onClose={() => setIsStepModalOpen(false)} projectId={project.id} />
        <StepDetailsModal isOpen={!!selectedStep} onClose={() => setSelectedStep(null)} step={selectedStep} />

        {/* Fullscreen Image Viewer */}
        {selectedImage && (
          <div 
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.9)', zIndex: 2000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'pointer'
            }}
          >
            <img src={selectedImage} alt="Receipt Full" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;

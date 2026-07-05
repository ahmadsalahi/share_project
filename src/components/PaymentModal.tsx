import React, { useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, projectId }) => {
  const { currentUser, addPayment } = useAppContext();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !currentUser) return;

    addPayment(projectId, {
      amount: Number(amount),
      date,
      payerId: currentUser.id,
      notes,
      receiptDataUrl: receiptUrl || undefined
    });
    
    // Reset
    setAmount('');
    setNotes('');
    setReceiptUrl('');
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={24} className="text-gradient" />
          إضافة دفعة مالية
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>المبلغ (ر.س)</label>
            <input 
              type="number" 
              className="input-field" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل المبلغ"
              min="1"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>تاريخ الدفع</label>
            <input 
              type="date" 
              className="input-field" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>ملاحظات (اختياري)</label>
            <textarea 
              className="input-field" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              rows={3}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>إيصال / إثبات الدفع (اختياري)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="btn-secondary" style={{ cursor: 'pointer', flex: 1 }}>
                <Upload size={18} />
                اختر صورة الإيصال
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            {receiptUrl && (
              <div style={{ marginTop: '1rem', position: 'relative', display: 'inline-block' }}>
                <img src={receiptUrl} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <button 
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', padding: '0.25rem', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            حفظ الدفعة
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;

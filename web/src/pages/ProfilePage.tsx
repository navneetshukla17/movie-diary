import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ChevronLeft, LogOut, Trash2 } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const flash = (msg: string) => {
    setNotice({ kind: 'success', text: msg });
    setTimeout(() => setNotice(null), 3000);
  };
  
  const showError = (msg: string) => {
    setNotice({ kind: 'error', text: msg });
    setTimeout(() => setNotice(null), 5000);
  };

  const deleteAccount = useMutation({
    mutationFn: () => {
      if (deleteInput !== 'DELETE') throw new Error("Please type DELETE to confirm");
      return api.deleteAccount();
    },
    onSuccess: () => {
      logout();
    },
    onError: (err) => showError(err instanceof Error ? err.message : 'Could not delete account'),
  });

  const isDeleting = deleteAccount.isPending;

  return (
    <div className="page" style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Notice Area */}
      {notice && (
        <div className="notice-area">
          <div className={`notice ${notice.kind}`}>
            <p>{notice.text}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <Trash2 size={48} color="var(--pink)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ color: 'var(--yellow)', marginBottom: '8px', marginTop: 0 }}>Delete Account?</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
              This will permanently delete your movie diary, including all lists and movies. This action cannot be undone.
            </p>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
              <label>Type DELETE to confirm</label>
              <input 
                type="text" 
                value={deleteInput} 
                onChange={(e) => setDeleteInput(e.target.value)} 
                placeholder="DELETE"
                style={{ textAlign: 'center' }}
              />
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1 }} disabled={isDeleting} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button 
                className="danger" 
                style={{ flex: 1 }}
                disabled={isDeleting || deleteInput !== 'DELETE'}
                onClick={() => deleteAccount.mutate()}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal 
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => flash('Password updated successfully')}
          onError={showError}
        />
      )}

      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        <button 
          aria-label="Back"
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', padding: 0, borderRadius: '50%', background: 'transparent', border: '2px solid var(--muted)', color: 'var(--text)' }}
        >
          <ChevronLeft size={24} />
        </button>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ color: 'var(--yellow)', marginBottom: '8px' }}>Profile Settings</h1>
        {data && (
          <div style={{ fontSize: '18px', color: 'var(--cyan)', wordBreak: 'break-all' }}>
            {data.user.email}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button 
          className="primary" 
          onClick={() => setShowPasswordModal(true)}
          style={{ padding: '16px', fontSize: '16px' }}
        >
          Change Password
        </button>
        
        <button 
          onClick={logout} 
          style={{ padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <LogOut size={20} /> Log Out
        </button>
        
        <button 
          className="danger" 
          onClick={() => setShowDeleteConfirm(true)}
          style={{ padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={20} /> Delete Account
        </button>
      </div>
    </div>
  );
}

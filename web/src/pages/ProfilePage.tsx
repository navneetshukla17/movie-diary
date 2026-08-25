import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Mode } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ChevronLeft, LogOut, Trash2 } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
  });

  const currentUser = data?.user ?? authUser;

  const [person1Name, setPerson1Name] = useState(currentUser?.person1Name ?? 'Me');
  const [person2Name, setPerson2Name] = useState(currentUser?.person2Name ?? 'Partner');
  const [defaultMode, setDefaultMode] = useState<Mode>(currentUser?.defaultMode ?? 'ALONE');

  useEffect(() => {
    if (currentUser) {
      setPerson1Name(currentUser.person1Name);
      setPerson2Name(currentUser.person2Name);
      setDefaultMode(currentUser.defaultMode);
    }
  }, [currentUser]);

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

  const updateProfileMutation = useMutation({
    mutationFn: () => {
      const p1 = person1Name.trim();
      const p2 = person2Name.trim();
      if (!p1) throw new Error('Person 1 name cannot be empty');
      if (!p2) throw new Error('Person 2 name cannot be empty');
      return api.updateProfile({ person1Name: p1, person2Name: p2, defaultMode });
    },
    onSuccess: (res) => {
      setAuthUser(res.user);
      queryClient.setQueryData(['me'], { user: res.user });
      flash('Profile names updated successfully! ✨');
    },
    onError: (err) => showError(err instanceof Error ? err.message : 'Could not update profile'),
  });

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
  const isSavingProfile = updateProfileMutation.isPending;

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

      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          aria-label="Back"
          onClick={() => navigate('/')} 
          className="header-icon-btn"
        >
          <ChevronLeft size={24} />
        </button>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--yellow)', marginBottom: '8px', fontFamily: 'var(--font-brand)' }}>Profile Settings</h1>
        {currentUser && (
          <div style={{ fontSize: '16px', color: 'var(--cyan)', wordBreak: 'break-all' }}>
            {currentUser.email}
          </div>
        )}
      </div>

      {/* Diary Profiles Card */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--pink)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ color: 'var(--yellow)', margin: '0 0 8px', fontSize: '18px', fontFamily: 'var(--font-brand)' }}>
          👥 Diary Profiles
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.4 }}>
          Customize the names for your individual lists. You, your partner, and your shared list ("US") will each have separate diaries.
        </p>

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="person1-name" style={{ color: 'var(--cyan)', fontSize: '12px' }}>
            Person 1 Name (Solo List)
          </label>
          <input
            id="person1-name"
            type="text"
            value={person1Name}
            onChange={(e) => setPerson1Name(e.target.value)}
            placeholder="e.g. Bob"
            maxLength={30}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="person2-name" style={{ color: 'var(--pink)', fontSize: '12px' }}>
            Person 2 Name (Partner Solo List)
          </label>
          <input
            id="person2-name"
            type="text"
            value={person2Name}
            onChange={(e) => setPerson2Name(e.target.value)}
            placeholder="e.g. Sheela"
            maxLength={30}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="default-mode-select" style={{ fontSize: '12px' }}>
            Default Starting Profile
          </label>
          <select
            id="default-mode-select"
            value={defaultMode}
            onChange={(e) => setDefaultMode(e.target.value as Mode)}
          >
            <option value="ALONE">{person1Name || 'Person 1'} (Solo)</option>
            <option value="PARTNER">{person2Name || 'Person 2'} (Solo)</option>
            <option value="US">US (Shared)</option>
          </select>
        </div>

        <button
          className="primary"
          disabled={isSavingProfile || !person1Name.trim() || !person2Name.trim()}
          onClick={() => updateProfileMutation.mutate()}
          style={{ width: '100%', padding: '12px', fontSize: '15px' }}
        >
          {isSavingProfile ? 'Saving...' : 'Save Profile Names ✨'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <button 
          onClick={() => setShowPasswordModal(true)}
          style={{ padding: '14px', fontSize: '15px' }}
        >
          Change Password 🔑
        </button>
        
        <button 
          onClick={logout} 
          style={{ padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <LogOut size={18} /> Log Out
        </button>
        
        <button 
          className="danger" 
          onClick={() => setShowDeleteConfirm(true)}
          style={{ padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={18} /> Delete Account
        </button>
      </div>
    </div>
  );
}

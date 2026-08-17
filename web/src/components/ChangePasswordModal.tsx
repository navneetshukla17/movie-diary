import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { KeyRound } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function ChangePasswordModal({ onClose, onSuccess, onError }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updatePassword = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      return api.updatePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Could not update password'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={24} /> Change Password
        </h2>
        <div className="form-group">
          <label>Current Password</label>
          <input 
            type="password" 
            value={currentPassword} 
            onChange={(e) => setCurrentPassword(e.target.value)} 
            disabled={updatePassword.isPending}
          />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            disabled={updatePassword.isPending}
          />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            disabled={updatePassword.isPending}
          />
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button style={{ flex: 1 }} disabled={updatePassword.isPending} onClick={onClose}>Cancel</button>
          <button 
            className="primary" 
            style={{ flex: 1 }}
            disabled={!currentPassword || !newPassword || !confirmPassword || updatePassword.isPending}
            onClick={() => updatePassword.mutate()}
          >
            {updatePassword.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

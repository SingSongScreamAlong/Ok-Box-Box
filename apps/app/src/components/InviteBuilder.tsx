import { useState, useEffect } from 'react';
import { 
  X, Mail, Search, Users, ChevronRight, Check, AlertCircle,
  Send, Clock, RefreshCw, Trash2, UserPlus, Shield, Loader2
} from 'lucide-react';
import {
  createInvite,
  getInvites,
  cancelInvite,
  resendInvite,
  searchUsers,
  TEAM_ROLES,
  LEAGUE_ROLES,
  Invite,
  InviteType,
  TeamRole,
  LeagueRole
} from '../lib/inviteService';

interface InviteBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  type: InviteType;
  targetId: string;
  targetName: string;
}

type Step = 'method' | 'recipient' | 'role' | 'message' | 'review' | 'sent';

interface SearchResult {
  id: string;
  name: string;
  email: string;
  irating?: number;
}

export function InviteBuilder({ isOpen, onClose, type, targetId, targetName }: InviteBuilderProps) {
  // Wizard state
  const [step, setStep] = useState<Step>('method');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'search'>('email');
  
  // Recipient state
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Role state
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Message state
  const [customMessage, setCustomMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  
  // Sending state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const roles = type === 'team' ? TEAM_ROLES : LEAGUE_ROLES;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('method');
      setInviteMethod('email');
      setEmail('');
      setRecipientName('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole(roles[0]?.id || '');
      setCustomMessage('');
      setSendEmail(true);
      setError(null);
    }
  }, [isOpen, roles]);

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setEmail(user.email);
    setRecipientName(user.name);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSendInvite = async () => {
    setSending(true);
    setError(null);

    const { data, error: inviteError } = await createInvite({
      type,
      targetId,
      targetName,
      inviteeEmail: email,
      inviteeName: recipientName || undefined,
      inviteeUserId: selectedUser?.id,
      role: selectedRole,
      message: customMessage || undefined,
      sendEmail
    });

    setSending(false);

    if (inviteError) {
      setError(inviteError);
      return;
    }

    if (data) {
      setStep('sent');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'method':
        return true;
      case 'recipient':
        return email.includes('@') && email.includes('.');
      case 'role':
        return !!selectedRole;
      case 'message':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['method', 'recipient', 'role', 'message', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['method', 'recipient', 'role', 'message', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const getSelectedRoleInfo = (): TeamRole | LeagueRole | undefined => {
    return roles.find(r => r.id === selectedRole);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0d0d0d] border border-white/10 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
              <UserPlus size={16} className="text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Invite to {type === 'team' ? 'Team' : 'League'}
              </h2>
              <p className="text-xs text-white/40">{targetName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress Steps */}
        {step !== 'sent' && (
          <div className="px-6 py-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              {['method', 'recipient', 'role', 'message', 'review'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s 
                      ? 'bg-[#3b82f6] text-white' 
                      : ['method', 'recipient', 'role', 'message', 'review'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/40'
                  }`}>
                    {['method', 'recipient', 'role', 'message', 'review'].indexOf(step) > i ? (
                      <Check size={12} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 4 && (
                    <div className={`w-8 h-0.5 ${
                      ['method', 'recipient', 'role', 'message', 'review'].indexOf(step) > i
                        ? 'bg-green-500'
                        : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">How would you like to invite?</h3>
              
              <button
                onClick={() => { setInviteMethod('email'); nextStep(); }}
                className="w-full flex items-center gap-4 p-4 border border-white/10 hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-[#3b82f6]/20 flex items-center justify-center group-hover:bg-[#3b82f6]/30 transition-colors">
                  <Mail size={20} className="text-[#3b82f6]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">Email Invite</p>
                  <p className="text-xs text-white/50">Send an invitation to any email address</p>
                </div>
                <ChevronRight size={16} className="text-white/30 group-hover:text-[#3b82f6] transition-colors" />
              </button>

              <button
                onClick={() => { setInviteMethod('search'); nextStep(); }}
                className="w-full flex items-center gap-4 p-4 border border-white/10 hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-[#f97316]/20 flex items-center justify-center group-hover:bg-[#f97316]/30 transition-colors">
                  <Search size={20} className="text-[#f97316]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">Find Existing User</p>
                  <p className="text-xs text-white/50">Search for someone already on Ok, Box Box</p>
                </div>
                <ChevronRight size={16} className="text-white/30 group-hover:text-[#f97316] transition-colors" />
              </button>
            </div>
          )}

          {/* Step 2: Recipient */}
          {step === 'recipient' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">
                {inviteMethod === 'email' ? 'Enter recipient details' : 'Search for a user'}
              </h3>

              {inviteMethod === 'search' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/10 pl-10 pr-4 py-3 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin" size={16} />
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-white/10 bg-[#0a0a0a] max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
                              <Users size={14} className="text-[#3b82f6]" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm text-white font-medium">{user.name}</p>
                              <p className="text-xs text-white/40">{user.email}</p>
                            </div>
                          </div>
                          {user.irating && (
                            <span className="text-xs text-[#f97316] font-mono">{user.irating} iR</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedUser && (
                    <div className="flex items-center gap-3 p-3 bg-[#3b82f6]/10 border border-[#3b82f6]/30">
                      <Check size={16} className="text-[#3b82f6]" />
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                        <p className="text-xs text-white/50">{selectedUser.email}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedUser(null); setEmail(''); setRecipientName(''); }}
                        className="text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {inviteMethod === 'email' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                      <input
                        type="email"
                        placeholder="driver@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/10 pl-10 pr-4 py-3 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Their name for the invite"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Role */}
          {step === 'role' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Select a role</h3>
              
              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-start gap-4 p-4 border transition-all text-left ${
                      selectedRole === role.id
                        ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedRole === role.id
                        ? 'border-[#3b82f6] bg-[#3b82f6]'
                        : 'border-white/30'
                    }`}>
                      {selectedRole === role.id && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{role.label}</p>
                      <p className="text-xs text-white/50 mt-1">{role.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.permissions.slice(0, 3).map(perm => (
                          <span key={perm} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded">
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Message */}
          {step === 'message' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Add a personal message (optional)</h3>
              
              <textarea
                placeholder={`Hey${recipientName ? ` ${recipientName.split(' ')[0]}` : ''}! We'd love to have you join our ${type}...`}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm text-white focus:border-[#3b82f6] focus:outline-none resize-none"
              />
              <p className="text-xs text-white/40">
                This message will be included in the invitation email.
              </p>

              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6]"
                />
                <label htmlFor="sendEmail" className="text-sm text-white cursor-pointer">
                  Send email notification
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Review your invitation</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Recipient</span>
                  <div className="text-right">
                    <p className="text-sm text-white">{recipientName || 'Not specified'}</p>
                    <p className="text-xs text-white/50">{email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Role</span>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-[#3b82f6]" />
                    <span className="text-sm text-white">{getSelectedRoleInfo()?.label}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 uppercase tracking-wider">{type === 'team' ? 'Team' : 'League'}</span>
                  <span className="text-sm text-white">{targetName}</span>
                </div>

                {customMessage && (
                  <div className="p-3 bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40 uppercase tracking-wider block mb-2">Message</span>
                    <p className="text-sm text-white/70 italic">"{customMessage}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Email Notification</span>
                  <span className={`text-sm ${sendEmail ? 'text-green-400' : 'text-white/50'}`}>
                    {sendEmail ? 'Will be sent' : 'Disabled'}
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Sent */}
          {step === 'sent' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Invitation Sent!</h3>
              <p className="text-sm text-white/50 mb-6">
                {sendEmail 
                  ? `An email has been sent to ${email}`
                  : 'The invitation has been created'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#3b82f6] text-white text-sm font-semibold uppercase tracking-wider hover:bg-[#2563eb] transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'sent' && (
          <div className="px-6 py-4 border-t border-white/10 flex justify-between flex-shrink-0">
            <button
              onClick={step === 'method' ? onClose : prevStep}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              {step === 'method' ? 'Cancel' : 'Back'}
            </button>
            
            {step === 'review' ? (
              <button
                onClick={handleSendInvite}
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b82f6] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#2563eb] transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Invite
                  </>
                )}
              </button>
            ) : step !== 'method' && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Invite Management Component
interface InviteManagerProps {
  type: InviteType;
  targetId: string;
}

export function InviteManager({ type, targetId }: InviteManagerProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, [type, targetId]);

  const loadInvites = async () => {
    setLoading(true);
    const data = await getInvites(type, targetId);
    setInvites(data);
    setLoading(false);
  };

  const handleCancel = async (inviteId: string) => {
    setActionLoading(inviteId);
    await cancelInvite(inviteId);
    setInvites(prev => prev.filter(i => i.id !== inviteId));
    setActionLoading(null);
  };

  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId);
    await resendInvite(inviteId);
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'accepted': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'declined': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'expired': return 'text-white/40 bg-white/10 border-white/20';
      default: return 'text-white/40 bg-white/10 border-white/20';
    }
  };

  const getRoleLabel = (roleId: string) => {
    const roles = type === 'team' ? TEAM_ROLES : LEAGUE_ROLES;
    return roles.find(r => r.id === roleId)?.label || roleId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invites.map(invite => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-4 bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
              <Mail size={18} className="text-[#3b82f6]" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                {invite.inviteeName || invite.inviteeEmail}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/40">{invite.inviteeEmail}</span>
                <span className="text-white/20">•</span>
                <span className="text-xs text-[#3b82f6]">{getRoleLabel(invite.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 border ${getStatusColor(invite.status)}`}>
              {invite.status}
            </span>

            {invite.status === 'pending' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleResend(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="p-2 text-white/40 hover:text-[#3b82f6] transition-colors disabled:opacity-50"
                  title="Resend invite"
                >
                  {actionLoading === invite.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </button>
                <button
                  onClick={() => handleCancel(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="p-2 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Cancel invite"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {invite.status === 'pending' && (
              <div className="flex items-center gap-1 text-white/30">
                <Clock size={12} />
                <span className="text-[10px]">
                  {Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import type { Currency, Notification, Payment, Project, ProjectStep, User } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const normalizeProject = (
  projectRow: any,
  partners: Array<{ user_id: string; percent: number }> = [],
  payments: Payment[] = [],
  steps: ProjectStep[] = [],
  shareRequests: Array<{ userId: string; percent: number; status: 'pending' | 'accepted' | 'rejected' }> = []
): Project => ({
  id: projectRow.id,
  title: projectRow.title,
  currency: projectRow.currency as Currency,
  targetSplit: projectRow.target_split ?? 50,
  createdAt: projectRow.created_at,
  ownerId: projectRow.owner_id,
  partners: partners.map(p => p.user_id),
  partnerShares: partners.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.user_id]: p.percent }), {}),
  payments,
  steps,
  completionPercentage: projectRow.completion_percentage ?? 0,
  isPrivate: Boolean(projectRow.is_private),
  shareRequests,
});

export const loadSupabaseData = async () => {
  if (!isSupabaseConfigured) return null;

  try {
    const [profilesResult, projectsResult, partnersResult, paymentsResult, stepsResult, shareRequestsResult, notificationsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('project_partners').select('*'),
      supabase.from('payments').select('*').order('created_at', { ascending: true }),
      supabase.from('project_steps').select('*').order('created_at', { ascending: true }),
      supabase.from('share_requests').select('*').order('created_at', { ascending: true }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ]);

    if (profilesResult.error || projectsResult.error || partnersResult.error || paymentsResult.error || stepsResult.error || shareRequestsResult.error || notificationsResult.error) {
      console.error('Supabase load failed', { profilesResult, projectsResult, partnersResult, paymentsResult, stepsResult, shareRequestsResult, notificationsResult });
      return null;
    }

    const users = (profilesResult.data || []).map((profile: any) => ({
      id: profile.id,
      name: profile.full_name,
      username: profile.username,
      password: '',
      role: profile.role as 'admin' | 'partner',
      isActive: profile.is_active,
    })) as User[];

    const partnersByProject = (partnersResult.data || []).reduce<Record<string, Array<{ user_id: string; percent: number }>>>((acc, row: any) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({ user_id: row.user_id, percent: row.percent ?? 0 });
      return acc;
    }, {});

    const paymentsByProject = (paymentsResult.data || []).reduce<Record<string, Payment[]>>((acc, row: any) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({
        id: row.id,
        amount: row.amount ?? 0,
        date: row.date,
        payerId: row.payer_id,
        notes: row.notes || '',
        receiptDataUrl: row.receipt_data_url || '',
        acknowledgedBy: [],
      });
      return acc;
    }, {});

    const stepsByProject = (stepsResult.data || []).reduce<Record<string, ProjectStep[]>>((acc, row: any) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({
        id: row.id,
        title: row.title,
        description: row.description || '',
        date: row.date,
        images: row.images || [],
      });
      return acc;
    }, {});

    const shareRequestsByProject = (shareRequestsResult.data || []).reduce<Record<string, Array<{ userId: string; percent: number; status: 'pending' | 'accepted' | 'rejected' }>>>((acc, row: any) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({ userId: row.user_id, percent: row.percent ?? 0, status: row.status });
      return acc;
    }, {});

    const projects = (projectsResult.data || []).map((projectRow: any) => normalizeProject(
      projectRow,
      partnersByProject[projectRow.id] || [],
      paymentsByProject[projectRow.id] || [],
      stepsByProject[projectRow.id] || [],
      shareRequestsByProject[projectRow.id] || []
    ));

    const notifications = (notificationsResult.data || []).map((notification: any) => ({
      id: notification.id,
      userId: notification.user_id,
      message: notification.message,
      date: notification.created_at,
      isRead: Boolean(notification.is_read),
      projectId: notification.project_id || undefined,
      senderId: notification.sender_id || undefined,
      requestedPercent: notification.requested_percent ?? undefined,
      type: notification.type as 'system' | 'share-request' | 'payment',
    } as Notification));

    return { users, projects, notifications };
  } catch (error) {
    console.error('Supabase load error', error);
    return null;
  }
};

export const persistUserToSupabase = async (user: User) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.name,
    username: user.username || user.name,
    role: user.role,
    is_active: user.isActive,
  }, { onConflict: 'id' });
};

export const persistProjectToSupabase = async (project: Project) => {
  if (!isSupabaseConfigured) return;

  await supabase.from('projects').upsert({
    id: project.id,
    owner_id: project.ownerId,
    title: project.title,
    currency: project.currency,
    target_split: project.targetSplit,
    is_private: project.isPrivate || false,
    completion_percentage: project.completionPercentage || 0,
    created_at: project.createdAt,
  }, { onConflict: 'id' });

  await supabase.from('project_partners').delete().eq('project_id', project.id);
  if (project.partners?.length) {
    await supabase.from('project_partners').insert(project.partners.map(id => ({
      project_id: project.id,
      user_id: id,
      percent: project.partnerShares?.[id] ?? 0,
    })));
  }
};

export const deleteProjectFromSupabase = async (projectId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('projects').delete().eq('id', projectId);
};

export const persistPaymentToSupabase = async (payment: Payment, projectId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('payments').upsert({
    id: payment.id,
    project_id: projectId,
    payer_id: payment.payerId,
    amount: payment.amount,
    date: payment.date,
    notes: payment.notes || '',
    receipt_data_url: payment.receiptDataUrl || '',
  }, { onConflict: 'id' });
};

export const removePaymentFromSupabase = async (projectId: string, paymentId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('payments').delete().eq('id', paymentId).eq('project_id', projectId);
};

export const persistStepToSupabase = async (step: ProjectStep, projectId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('project_steps').upsert({
    id: step.id,
    project_id: projectId,
    title: step.title,
    description: step.description || '',
    date: step.date,
    images: step.images || [],
  }, { onConflict: 'id' });
};

export const removeStepFromSupabase = async (projectId: string, stepId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('project_steps').delete().eq('id', stepId).eq('project_id', projectId);
};

export const persistNotificationToSupabase = async (notification: Notification) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('notifications').upsert({
    id: notification.id,
    user_id: notification.userId,
    project_id: notification.projectId || null,
    sender_id: notification.senderId || null,
    message: notification.message,
    type: notification.type || 'system',
    requested_percent: notification.requestedPercent ?? null,
    is_read: notification.isRead,
  }, { onConflict: 'id' });
};

export const markNotificationReadInSupabase = async (notificationId: string, isRead: boolean) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('notifications').update({ is_read: isRead }).eq('id', notificationId);
};

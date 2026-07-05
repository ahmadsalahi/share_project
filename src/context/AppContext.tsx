import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Project, Payment, ProjectStep, Notification } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { deleteProjectFromSupabase, loadSupabaseData, markNotificationReadInSupabase, persistNotificationToSupabase, persistPaymentToSupabase, persistProjectToSupabase, persistStepToSupabase, persistUserToSupabase, removePaymentFromSupabase, removeStepFromSupabase } from '../lib/supabaseSync';

interface AppContextType {
  users: User[];
  currentUser: User | null;
  projects: Project[];
  notifications: Notification[];
  login: (username: string, password?: string) => string | null; // returns error message if any
  logout: () => void;
  // Admin User Actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => string | null; // returns error message if cannot delete
  // Project Actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'payments'>) => string;
  updateProject: (id: string, projectData: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Payment Actions
  addPayment: (projectId: string, payment: Omit<Payment, 'id' | 'acknowledgedBy'>) => void;
  deletePayment: (projectId: string, paymentId: string) => void;
  acknowledgePayment: (projectId: string, paymentId: string, userId: string) => void;
  // Step Actions
  addProjectStep: (projectId: string, step: Omit<ProjectStep, 'id'>) => void;
  deleteProjectStep: (projectId: string, stepId: string) => void;
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  respondToShareRequest: (projectId: string, userId: string, accepted: boolean) => void;
}

const defaultAdmin: User = {
  id: 'user_admin',
  name: 'مدير النظام',
  username: 'admin',
  password: '123',
  role: 'admin',
  isActive: true
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem('users');
      const parsed = savedUsers && savedUsers !== 'undefined' ? JSON.parse(savedUsers) : null;
      // If we don't have valid users array (like from older version), clear it out
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].role) {
        return [defaultAdmin];
      }
      return parsed;
    } catch {
      return [defaultAdmin];
    }
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const parsed = savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const savedProjects = localStorage.getItem('projects');
      const parsed = savedProjects && savedProjects !== 'undefined' ? JSON.parse(savedProjects) : [];
      if (!Array.isArray(parsed)) return [];
      // Normalize old projects that might not have fields added by newer versions
      return parsed.map((p: Project) => ({
        ...p,
        ownerId: p.ownerId || (Array.isArray(p.partners) && p.partners.length > 0 ? p.partners[0] : defaultAdmin.id),
        partners: Array.isArray(p.partners) ? p.partners : [],
        partnerShares: p.partnerShares || undefined,
        shareRequests: Array.isArray(p.shareRequests) ? p.shareRequests : [],
        steps: Array.isArray(p.steps) ? p.steps : [],
        completionPercentage: typeof p.completionPercentage === 'number' ? p.completionPercentage : 0,
        isPrivate: typeof p.isPrivate === 'boolean' ? p.isPrivate : false,
      }));
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      const parsed = savedNotifications && savedNotifications !== 'undefined' ? JSON.parse(savedNotifications) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const loadRemoteData = async () => {
      if (!isSupabaseConfigured) return;
      const remoteData = await loadSupabaseData();
      if (!remoteData) return;
      if (remoteData.users.length > 0) {
        setUsers(remoteData.users);
      }
      if (remoteData.projects.length > 0) {
        setProjects(remoteData.projects);
      }
      if (remoteData.notifications.length > 0) {
        setNotifications(remoteData.notifications);
      }
    };

    void loadRemoteData();
  }, []);

  const login = (username: string, password?: string) => {
    const user = users.find(u => (u.username || u.name) === username && u.password === password);
    if (!user) {
      return 'بيانات الدخول غير صحيحة';
    }
    if (!user.isActive) {
      return 'حسابك موقوف، الرجاء مراجعة الإدارة';
    }
    setCurrentUser(user);
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // User Management
  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `user_${Date.now()}` };
    setUsers(prev => [...prev, newUser]);
    void persistUserToSupabase(newUser);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    const updatedUser = updatedUsers.find(u => u.id === id);
    if (updatedUser) {
      void persistUserToSupabase(updatedUser);
    }
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    // Check if user is linked to any project
    const hasProjects = projects.some(p => p.partners.includes(id) || p.payments.some(pay => pay.payerId === id));
    if (hasProjects) {
      return 'لا يمكن حذف هذا الشريك لوجود ارتباط بمشاريع أو دفعات مالية. يمكنك إيقاف الحساب بدلاً من حذفه.';
    }
    setUsers(users.filter(u => u.id !== id));
    return null;
  };

  // Project Management
  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'payments'>) => {
    const id = `proj_${Date.now()}`;
    const newProject: Project = {
      ...projectData,
      id,
      createdAt: new Date().toISOString(),
      payments: [],
      steps: [],
      completionPercentage: 0,
      shareRequests: projectData.shareRequests || [],
    };
    setProjects(prev => [...prev, newProject]);
    void persistProjectToSupabase(newProject);
    return id;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const updatedProject = next.find(p => p.id === id);
      if (updatedProject) {
        void persistProjectToSupabase(updatedProject);
      }
      return next;
    });
  };

  const deleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const isAdmin = currentUser?.role === 'admin';
    const isOwner = currentUser?.id === project.ownerId;
    const canDelete = isAdmin || (Boolean(project.isPrivate) && isOwner);

    if (!canDelete) return;

    setProjects(prev => prev.filter(p => p.id !== id));
    void deleteProjectFromSupabase(id);
  };

  // Payment Management
  const addPayment = (projectId: string, paymentData: Omit<Payment, 'id' | 'acknowledgedBy'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: `pay_${Date.now()}`,
      acknowledgedBy: [paymentData.payerId]
    };
    setProjects(prev => prev.map(proj =>
      proj.id === projectId ? { ...proj, payments: [...proj.payments, newPayment] } : proj
    ));
    void persistPaymentToSupabase(newPayment, projectId);
  };

  const deletePayment = (projectId: string, paymentId: string) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId ? { ...proj, payments: proj.payments.filter(p => p.id !== paymentId) } : proj
    ));
    void removePaymentFromSupabase(projectId, paymentId);
  };

  const acknowledgePayment = (projectId: string, paymentId: string, userId: string) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id !== projectId) return proj;
      return {
        ...proj,
        payments: proj.payments.map(p => {
          if (p.id !== paymentId) return p;
          const currentAcks = p.acknowledgedBy || [];
          if (currentAcks.includes(userId)) return p;
          return { ...p, acknowledgedBy: [...currentAcks, userId] };
        })
      };
    }));
  };

  // Step Management
  const addProjectStep = (projectId: string, stepData: Omit<ProjectStep, 'id'>) => {
    const newStep: ProjectStep = { ...stepData, id: `step_${Date.now()}` };
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? { ...proj, steps: [...(Array.isArray(proj.steps) ? proj.steps : []), newStep] }
        : proj
    ));
    void persistStepToSupabase(newStep, projectId);
  };

  const deleteProjectStep = (projectId: string, stepId: string) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? { ...proj, steps: (Array.isArray(proj.steps) ? proj.steps : []).filter(s => s.id !== stepId) }
        : proj
    ));
    void removeStepFromSupabase(projectId, stepId);
  };

  // Notification Management
  const addNotification = (notificationData: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random()}`,
      date: new Date().toISOString(),
      isRead: false,
      type: notificationData.type || 'system'
    };
    setNotifications(prev => [newNotification, ...prev]);
    void persistNotificationToSupabase(newNotification);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    void markNotificationReadInSupabase(id, true);
  };

  const markAllNotificationsAsRead = (userId: string) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, isRead: true } : n));
  };

  const respondToShareRequest = (projectId: string, userId: string, accepted: boolean) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const request = project.shareRequests?.find(r => r.userId === userId && r.status === 'pending');
    if (!request) return;

    const updatedShareRequests = project.shareRequests!.map(r =>
      r.userId === userId ? { ...r, status: accepted ? 'accepted' : 'rejected' as 'accepted' | 'rejected' } : r
    ) as Array<{ userId: string; percent: number; status: 'pending' | 'accepted' | 'rejected' }>;

    let updatedPartners = [...(project.partners || [])];
    let updatedPartnerShares = project.partnerShares ? { ...project.partnerShares } : {};

    if (accepted && !updatedPartners.includes(userId)) {
      const existingPartnerIds = updatedPartners.length > 0 ? updatedPartners : [project.ownerId];
      const requestedPercent = request.percent;
      const remaining = Math.max(0, 100 - requestedPercent);
      const partnerCount = existingPartnerIds.length;
      const base = partnerCount > 0 ? Math.floor(remaining / partnerCount) : 0;
      const extra = partnerCount > 0 ? remaining - base * partnerCount : 0;

      updatedPartnerShares = existingPartnerIds.reduce<Record<string, number>>((acc, pid, idx) => ({
        ...acc,
        [pid]: base + (idx < extra ? 1 : 0)
      }), {});
      updatedPartnerShares[userId] = requestedPercent;
      updatedPartners = Array.from(new Set([...updatedPartners, userId]));
    }

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, shareRequests: updatedShareRequests, partnerShares: updatedPartnerShares, partners: updatedPartners }
        : p
    ));

    const recipient = users.find(u => u.id === project.ownerId);
    const requesterName = users.find(u => u.id === userId)?.name || 'شريك';
    if (recipient) {
      addNotification({
        userId: recipient.id,
        projectId,
        senderId: userId,
        requestedPercent: request.percent,
        type: 'system',
        message: `${requesterName} ${accepted ? 'وافق' : 'رفض'} طلب المشاركة على مشروع "${project.title}" بنسبة ${request.percent}%`
      });
    }
  };

  return (
    <AppContext.Provider value={{ 
      users, currentUser, projects, notifications,
      login, logout, 
      addUser, updateUser, deleteUser,
      addProject, updateProject, deleteProject, 
      addPayment, deletePayment, acknowledgePayment,
      addProjectStep, deleteProjectStep,
      addNotification, markNotificationAsRead, markAllNotificationsAsRead, respondToShareRequest
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Project, Payment, ProjectStep, Notification } from '../types';
import { isFirebaseConfigured } from '../lib/firebase';
import { clearFirebaseData, deleteProjectFromFirebase, loadFirebaseData, markNotificationReadInFirebase, persistNotificationToFirebase, persistPaymentToFirebase, persistProjectToFirebase, persistStepToFirebase, persistUserToFirebase, removePaymentFromFirebase, removeStepFromFirebase } from '../lib/firebaseSync';

interface AppContextType {
  users: User[];
  currentUser: User | null;
  projects: Project[];
  notifications: Notification[];
  login: (username: string, password?: string) => Promise<string | null>; // returns error message if any
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

const isValidUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const createUuid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeId = (value?: string): string => (isValidUuid(value) ? value! : createUuid());

const STORAGE_RESET_VERSION = '2026-07-05-admin-reset';
let hasClearedStoredAppData = false;

const createDefaultAdmin = (): User => ({
  id: 'admin-default-id',
  name: 'مدير النظام',
  username: 'admin',
  password: '123',
  role: 'admin',
  isActive: true
});

const clearStoredAppData = () => {
  if (typeof window === 'undefined') return;

  ['users', 'currentUser', 'projects', 'notifications'].forEach((key) => {
    window.localStorage.removeItem(key);
  });

  try {
    window.sessionStorage.clear();
  } catch {
    // Ignore storage access issues in restricted environments.
  }

  window.localStorage.setItem('app-data-reset-version', STORAGE_RESET_VERSION);
  void clearFirebaseData();
};

const shouldResetStoredData = () => {
  if (typeof window === 'undefined') return false;
  if (hasClearedStoredAppData) return false;

  const storedVersion = window.localStorage.getItem('app-data-reset-version');
  if (storedVersion === STORAGE_RESET_VERSION) return false;

  clearStoredAppData();
  hasClearedStoredAppData = true;
  return true;
};



const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      if (typeof window === 'undefined') return [createDefaultAdmin()];
      if (shouldResetStoredData()) return [createDefaultAdmin()];

      const savedUsers = localStorage.getItem('users');
      const parsed = savedUsers && savedUsers !== 'undefined' ? JSON.parse(savedUsers) : null;
      // If we don't have valid users array (like from older version), clear it out
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].role) {
        return [createDefaultAdmin()];
      }
      return parsed.map((user: User) => ({ ...user, id: normalizeId(user.id) }));
    } catch {
      return [createDefaultAdmin()];
    }
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      if (shouldResetStoredData()) return createDefaultAdmin();

      const savedUser = localStorage.getItem('currentUser');
      const parsed = savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
      return parsed && typeof parsed === 'object' ? { ...parsed, id: normalizeId(parsed.id) } : null;
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
        id: normalizeId(p.id),
        ownerId: normalizeId(p.ownerId || (Array.isArray(p.partners) && p.partners.length > 0 ? p.partners[0] : createDefaultAdmin().id)),
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

  // Sync state with Firebase on load
  useEffect(() => {
    const loadRemoteData = async () => {
      if (!isFirebaseConfigured) return;
      const remoteData = await loadFirebaseData();
      if (!remoteData) return;

      // If there are no profiles in Firestore (fresh db), save default admin profile
      if (remoteData.users.length === 0) {
        const defaultAdmin = createDefaultAdmin();
        await persistUserToFirebase(defaultAdmin);
        remoteData.users = [defaultAdmin];
      }
      
      setUsers(remoteData.users);
      setProjects(remoteData.projects);
      setNotifications(remoteData.notifications);

      // Restore session locally if still valid in Firestore
      const savedUserJson = localStorage.getItem('currentUser');
      if (savedUserJson) {
        try {
          const parsed = JSON.parse(savedUserJson);
          if (parsed && parsed.id) {
            const matchedUser = remoteData.users.find(u => u.id === parsed.id);
            if (matchedUser && matchedUser.isActive) {
              setCurrentUser(matchedUser);
            } else {
              setCurrentUser(null);
            }
          }
        } catch {
          setCurrentUser(null);
        }
      }
    };

    void loadRemoteData();
  }, []);

  const login = async (username: string, password?: string) => {
    if (!password) return 'الرجاء إدخال كلمة المرور';

    let currentUsers = users;
    // If users array only has the local stub, load profiles from firestore
    if (currentUsers.length === 0 || (currentUsers.length === 1 && currentUsers[0].id === 'admin-default-id')) {
      const remoteData = await loadFirebaseData();
      if (remoteData && remoteData.users.length > 0) {
        currentUsers = remoteData.users;
        setUsers(remoteData.users);
      }
    }

    const user = currentUsers.find(u => (u.username || u.name).toLowerCase() === username.toLowerCase().trim() && u.password === password);
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
  const addUser = async (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: createUuid(),
      password: userData.password || '123'
    };
    setUsers(prev => [...prev, newUser]);
    await persistUserToFirebase(newUser);
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    
    const updatedUser = updatedUsers.find(u => u.id === id);
    if (updatedUser) {
      await persistUserToFirebase(updatedUser);
    }
    
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    const hasProjects = projects.some(p => p.partners.includes(id) || p.payments.some(pay => pay.payerId === id));
    if (hasProjects) {
      return 'لا يمكن حذف هذا الشريك لوجود ارتباط بمشاريع أو دفعات مالية. يمكنك إيقاف الحساب بدلاً من حذفه.';
    }
    setUsers(users.filter(u => u.id !== id));
    return null;
  };

  // Project Management
  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'payments'>) => {
    const id = createUuid();
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
    void persistProjectToFirebase(newProject);
    return id;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const updatedProject = next.find(p => p.id === id);
      if (updatedProject) {
        void persistProjectToFirebase(updatedProject);
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
    void deleteProjectFromFirebase(id);
  };

  // Payment Management
  const addPayment = (projectId: string, paymentData: Omit<Payment, 'id' | 'acknowledgedBy'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: createUuid(),
      acknowledgedBy: [paymentData.payerId]
    };
    setProjects(prev => prev.map(proj =>
      proj.id === projectId ? { ...proj, payments: [...proj.payments, newPayment] } : proj
    ));
    void persistPaymentToFirebase(newPayment, projectId);
  };

  const deletePayment = (projectId: string, paymentId: string) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId ? { ...proj, payments: proj.payments.filter(p => p.id !== paymentId) } : proj
    ));
    void removePaymentFromFirebase(projectId, paymentId);
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
          const updatedPayment = { ...p, acknowledgedBy: [...currentAcks, userId] };
          void persistPaymentToFirebase(updatedPayment, projectId);
          return updatedPayment;
        })
      };
    }));
  };

  // Step Management
  const addProjectStep = (projectId: string, stepData: Omit<ProjectStep, 'id'>) => {
    const newStep: ProjectStep = { ...stepData, id: createUuid() };
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? { ...proj, steps: [...(Array.isArray(proj.steps) ? proj.steps : []), newStep] }
        : proj
    ));
    void persistStepToFirebase(newStep, projectId);
  };

  const deleteProjectStep = (projectId: string, stepId: string) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? { ...proj, steps: (Array.isArray(proj.steps) ? proj.steps : []).filter(s => s.id !== stepId) }
        : proj
    ));
    void removeStepFromFirebase(projectId, stepId);
  };

  // Notification Management
  const addNotification = (notificationData: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: createUuid(),
      date: new Date().toISOString(),
      isRead: false,
      type: notificationData.type || 'system'
    };
    setNotifications(prev => [newNotification, ...prev]);
    void persistNotificationToFirebase(newNotification);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    void markNotificationReadInFirebase(id, true);
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

    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id === projectId) {
          const updatedProj = { ...p, shareRequests: updatedShareRequests, partnerShares: updatedPartnerShares, partners: updatedPartners };
          void persistProjectToFirebase(updatedProj);
          return updatedProj;
        }
        return p;
      });
      return next;
    });

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

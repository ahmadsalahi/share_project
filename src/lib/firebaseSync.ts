import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { User, Project, Payment, ProjectStep, Notification, Currency } from '../types';

export const loadFirebaseData = async () => {
  if (!isFirebaseConfigured) return null;

  try {
    const [profilesSnap, projectsSnap, paymentsSnap, stepsSnap, notificationsSnap] = await Promise.all([
      getDocs(collection(db, 'profiles')),
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'project_steps')),
      getDocs(collection(db, 'notifications')),
    ]);

    const users = profilesSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.full_name || '',
        username: data.username || '',
        password: data.password || '123',
        role: data.role || 'partner',
        isActive: data.is_active ?? true,
      };
    }) as User[];

    // Parse payments grouped by projectId
    const paymentsByProject: Record<string, Payment[]> = {};
    paymentsSnap.docs.forEach(d => {
      const data = d.data();
      const projectId = data.projectId;
      if (!projectId) return;
      if (!paymentsByProject[projectId]) {
        paymentsByProject[projectId] = [];
      }
      paymentsByProject[projectId].push({
        id: d.id,
        amount: data.amount ?? 0,
        date: data.date || '',
        payerId: data.payerId || '',
        notes: data.notes || '',
        receiptDataUrl: data.receiptDataUrl || '',
        acknowledgedBy: data.acknowledgedBy || [],
      });
    });

    // Parse steps grouped by projectId
    const stepsByProject: Record<string, ProjectStep[]> = {};
    stepsSnap.docs.forEach(d => {
      const data = d.data();
      const projectId = data.projectId;
      if (!projectId) return;
      if (!stepsByProject[projectId]) {
        stepsByProject[projectId] = [];
      }
      stepsByProject[projectId].push({
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        images: data.images || [],
      });
    });

    // Sort payments and steps
    Object.keys(paymentsByProject).forEach(projectId => {
      paymentsByProject[projectId].sort((a, b) => a.date.localeCompare(b.date));
    });
    Object.keys(stepsByProject).forEach(projectId => {
      stepsByProject[projectId].sort((a, b) => a.date.localeCompare(b.date));
    });

    const projects = projectsSnap.docs.map(d => {
      const data = d.data();
      const projectId = d.id;
      return {
        id: projectId,
        title: data.title || '',
        currency: (data.currency || 'USD') as Currency,
        targetSplit: data.targetSplit ?? 50,
        createdAt: data.createdAt || '',
        ownerId: data.ownerId || '',
        partners: data.partners || [],
        partnerShares: data.partnerShares || {},
        shareRequests: data.shareRequests || [],
        payments: paymentsByProject[projectId] || [],
        steps: stepsByProject[projectId] || [],
        completionPercentage: data.completionPercentage ?? 0,
        isPrivate: Boolean(data.isPrivate),
      };
    }) as Project[];

    // Sort projects by createdAt
    projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const notifications = notificationsSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId || '',
        message: data.message || '',
        date: data.date || '',
        isRead: Boolean(data.isRead),
        projectId: data.projectId || undefined,
        senderId: data.senderId || undefined,
        requestedPercent: data.requestedPercent ?? undefined,
        type: data.type as 'system' | 'share-request' | 'payment',
      };
    }) as Notification[];

    // Sort notifications descending by date
    notifications.sort((a, b) => b.date.localeCompare(a.date));

    return { users, projects, notifications };
  } catch (error) {
    console.error('Firebase data load error:', error);
    return null;
  }
};

export const clearFirebaseData = async () => {
  if (!isFirebaseConfigured) return;
  
  const collections = ['profiles', 'projects', 'payments', 'project_steps', 'notifications'];
  for (const collName of collections) {
    try {
      const snap = await getDocs(collection(db, collName));
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(doc(db, collName, d.id));
      });
      await batch.commit();
    } catch (e) {
      console.error(`Error clearing ${collName} collection:`, e);
    }
  }
};

export const persistUserToFirebase = async (user: User) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'profiles', user.id), {
    full_name: user.name,
    username: user.username || user.name,
    password: user.password || '123',
    role: user.role,
    is_active: user.isActive,
  }, { merge: true });
};

export const persistProjectToFirebase = async (project: Project) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'projects', project.id), {
    ownerId: project.ownerId,
    title: project.title,
    currency: project.currency,
    targetSplit: project.targetSplit,
    isPrivate: project.isPrivate || false,
    completionPercentage: project.completionPercentage || 0,
    createdAt: project.createdAt,
    partners: project.partners || [],
    partnerShares: project.partnerShares || {},
    shareRequests: project.shareRequests || [],
  }, { merge: true });

  // Persist project steps to project_steps collection
  if (project.steps && Array.isArray(project.steps)) {
    for (const step of project.steps) {
      await setDoc(doc(db, 'project_steps', step.id), {
        projectId: project.id,
        title: step.title,
        description: step.description || '',
        date: step.date,
        images: step.images || [],
      }, { merge: true });
    }
  }
};

export const deleteProjectFromFirebase = async (projectId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'projects', projectId));

  // Clean up associated payments and steps
  try {
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    const stepsSnap = await getDocs(collection(db, 'project_steps'));

    const batch = writeBatch(db);
    paymentsSnap.docs.forEach(d => {
      if (d.data().projectId === projectId) {
        batch.delete(doc(db, 'payments', d.id));
      }
    });
    stepsSnap.docs.forEach(d => {
      if (d.data().projectId === projectId) {
        batch.delete(doc(db, 'project_steps', d.id));
      }
    });
    await batch.commit();
  } catch (e) {
    console.error('Error cleaning up project sub-collections:', e);
  }
};

export const persistPaymentToFirebase = async (payment: Payment, projectId: string) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'payments', payment.id), {
    projectId,
    payerId: payment.payerId,
    amount: payment.amount,
    date: payment.date,
    notes: payment.notes || '',
    receiptDataUrl: payment.receiptDataUrl || '',
    acknowledgedBy: payment.acknowledgedBy || [],
  }, { merge: true });
};

export const removePaymentFromFirebase = async (_projectId: string, paymentId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'payments', paymentId));
};

export const persistStepToFirebase = async (step: ProjectStep, projectId: string) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'project_steps', step.id), {
    projectId,
    title: step.title,
    description: step.description || '',
    date: step.date,
    images: step.images || [],
  }, { merge: true });
};

export const removeStepFromFirebase = async (_projectId: string, stepId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'project_steps', stepId));
};

export const persistNotificationToFirebase = async (notification: Notification) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'notifications', notification.id), {
    userId: notification.userId,
    projectId: notification.projectId || null,
    senderId: notification.senderId || null,
    message: notification.message,
    type: notification.type || 'system',
    requestedPercent: notification.requestedPercent ?? null,
    isRead: notification.isRead,
    date: notification.date,
  }, { merge: true });
};

export const markNotificationReadInFirebase = async (notificationId: string, isRead: boolean) => {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, 'notifications', notificationId), {
    isRead: isRead
  });
};

import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, getDocs, deleteDoc, writeBatch, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { ClothingItem, ChatMessage, ChatSession } from '../types';

// ... (handleFirestoreError logic) ...

export const createSession = async (userId: string, firstMessage: string) => {
  try {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const ref = doc(db, 'users', userId, 'sessions', sessionId);
    await setDoc(ref, {
      title: firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : ''),
      lastMessage: firstMessage,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    return sessionId;
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/sessions`);
    return null;
  }
};

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) => {
  if (error?.message?.includes('Missing or insufficient permissions')) {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      // Ignore permission denied errors if the user is already signed out
      // This happens occasionally when logging out before snapshot listeners are fully unsubscribed
      console.warn('Ignoring permission denied error because user is signed out (expected during logout)');
      return;
    }

    const authInfo = {
      userId: user.uid,
      email: user.email || '',
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerInfo: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    };
    
    console.error(JSON.stringify({
      error: error.message,
      operationType,
      path,
      authInfo
    } as FirestoreErrorInfo, null, 2));
    return;
  }
  console.error(error);
};

export const syncWardrobeItem = async (userId: string, item: ClothingItem) => {
  try {
    const ref = doc(db, 'users', userId, 'wardrobe', item.id);
    const { id, ...itemData } = item;
    
    try {
      await updateDoc(ref, {
        ...itemData,
        updatedAt: serverTimestamp()
      });
    } catch (updateErr: any) {
      if (updateErr.code === 'not-found' || updateErr.message?.includes('No document to update')) {
        await setDoc(ref, {
          ...itemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        throw updateErr;
      }
    }
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/wardrobe/${item.id}`);
  }
};

export const deleteWardrobeItemDB = async (userId: string, itemId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'wardrobe', itemId));
  } catch (err: any) {
    handleFirestoreError(err, 'delete', `users/${userId}/wardrobe/${itemId}`);
  }
};

export const syncChatMessage = async (userId: string, msg: ChatMessage) => {
  try {
    const ref = doc(db, 'users', userId, 'chats', msg.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        role: msg.role,
        text: msg.text,
        ...(msg.itemIds && { itemIds: msg.itemIds }),
        isLogged: msg.isLogged || false,
        timestamp: serverTimestamp()
      });
    } else {
      await updateDoc(ref, {
        isLogged: msg.isLogged || false
      });
    }
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/chats/${msg.id}`);
  }
};

export const updateChatMessageLoggedStatus = async (userId: string, messageId: string, isLogged: boolean) => {
  try {
    const ref = doc(db, 'users', userId, 'chats', messageId);
    await updateDoc(ref, { isLogged, updatedAt: serverTimestamp() });
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/chats/${messageId}`);
  }
};

export const clearChatHistory = async (userId: string) => {
  try {
    const chatRef = collection(db, 'users', userId, 'chats');
    const snap = await getDocs(chatRef);
    const batch = writeBatch(db);
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (err: any) {
    handleFirestoreError(err, 'delete', `users/${userId}/chats`);
  }
};

export const getOrInitUser = async (userId: string, email: string) => {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email,
        memory: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return [];
    }
    return snap.data()?.memory || [];
  } catch (err: any) {
    handleFirestoreError(err, 'get', `users/${userId}`);
    return [];
  }
};

export const subscribeToSessions = (userId: string, callback: (sessions: ChatSession[]) => void) => {
  const q = query(collection(db, 'users', userId, 'sessions'), orderBy('updatedAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const sessions: ChatSession[] = [];
    snapshot.forEach(d => {
      const data = d.data();
      sessions.push({
        id: d.id,
        title: data.title || 'New Chat',
        lastMessage: data.lastMessage || '',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      });
    });
    callback(sessions);
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/sessions`);
  });
};

export const subscribeToSessionMessages = (userId: string, sessionId: string, callback: (chats: ChatMessage[]) => void) => {
  const q = query(collection(db, 'users', userId, 'sessions', sessionId, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const chats: ChatMessage[] = [];
    snapshot.forEach(d => {
      const data = d.data();
      chats.push({
        id: d.id,
        role: data.role,
        text: data.text,
        itemIds: data.itemIds || [],
        isLogged: data.isLogged || false,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
      });
    });
    callback(chats);
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/sessions/${sessionId}/messages`);
  });
};

export const syncSessionMessage = async (userId: string, sessionId: string, msg: ChatMessage) => {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    const msgRef = doc(db, 'users', userId, 'sessions', sessionId, 'messages', msg.id);
    
    const batch = writeBatch(db);
    batch.set(msgRef, {
      role: msg.role,
      text: msg.text,
      ...(msg.itemIds && { itemIds: msg.itemIds }),
      isLogged: msg.isLogged || false,
      timestamp: serverTimestamp()
    });
    
    batch.update(sessionRef, {
      lastMessage: msg.text,
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/sessions/${sessionId}/messages/${msg.id}`);
  }
};

export const updateSessionMessageLoggedStatus = async (userId: string, sessionId: string, messageId: string, isLogged: boolean) => {
  try {
    const ref = doc(db, 'users', userId, 'sessions', sessionId, 'messages', messageId);
    await updateDoc(ref, { isLogged, updatedAt: serverTimestamp() });
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/sessions/${sessionId}/messages/${messageId}`);
  }
};

export const deleteSession = async (userId: string, sessionId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
  } catch (err: any) {
    handleFirestoreError(err, 'delete', `users/${userId}/sessions/${sessionId}`);
  }
};

export const subscribeToMemory = (userId: string, callback: (mem: string[]) => void) => {
  return onSnapshot(doc(db, 'users', userId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().memory || []);
    }
  }, (error) => {
    handleFirestoreError(error, 'get', `users/${userId}`);
  });
};

export const subscribeToWardrobe = (userId: string, callback: (items: ClothingItem[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'wardrobe'), (snapshot) => {
    const items: ClothingItem[] = [];
    snapshot.forEach(d => {
      const data = d.data() as any;
      items.push({
        id: d.id,
        image: data.image,
        category: data.category,
        silhouette: data.silhouette,
        name: data.name,
        color: data.color,
        hexColor: data.hexColor,
        material: data.material,
        pattern: data.pattern,
        style: data.style,
        season: data.season,
        description: data.description,
        wearCount: data.wearCount
      });
    });
    callback(items);
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/wardrobe`);
  });
};

export const subscribeToChats = (userId: string, callback: (chats: ChatMessage[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'chats'), (snapshot) => {
    const chats: ChatMessage[] = [];
    snapshot.forEach(d => {
      const data = d.data() as any;
      chats.push({
        id: d.id,
        role: data.role,
        text: data.text,
        itemIds: data.itemIds || [],
        isLogged: data.isLogged || false,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
      });
    });
    callback(chats.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/chats`);
  });
};

export const appendMemoryFact = async (userId: string, newFacts: string[]) => {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const mem = snap.data().memory || [];
      const updated = Array.from(new Set([...mem, ...newFacts]));
      await updateDoc(ref, { memory: updated, updatedAt: serverTimestamp() });
    }
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}`);
  }
};

export const syncEvent = async (userId: string, event: import('../types').CalendarEvent) => {
  try {
    const ref = doc(db, 'users', userId, 'events', event.id);
    const { id, createdAt, ...eventData } = event;
    const cleanData = Object.fromEntries(
      Object.entries(eventData).filter(([_, v]) => v !== undefined)
    );

    try {
      await updateDoc(ref, {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
    } catch (updateErr: any) {
      if (updateErr.code === 'not-found' || updateErr.message?.includes('No document to update')) {
        await setDoc(ref, {
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        throw updateErr;
      }
    }
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/events/${event.id}`);
  }
};

export const deleteEventDB = async (userId: string, eventId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'events', eventId));
  } catch (err: any) {
    handleFirestoreError(err, 'delete', `users/${userId}/events/${eventId}`);
  }
};

export const subscribeToEvents = (userId: string, callback: (events: import('../types').CalendarEvent[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'events'), (snapshot) => {
    const events: import('../types').CalendarEvent[] = [];
    snapshot.forEach(d => {
      const data = d.data() as any;
      events.push({
        id: d.id,
        title: data.title,
        date: data.date,
        time: data.time || undefined,
        type: data.type,
        location: data.location || undefined,
        description: data.description || undefined,
        aiReasoning: data.aiReasoning || undefined,
        thread: data.thread || undefined,
        outfitItemIds: data.outfitItemIds || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString())
      });
    });
    callback(events);
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/events`);
  });
};

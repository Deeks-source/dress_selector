import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { ClothingItem, ChatMessage } from '../types';

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
    const exists = (await getDoc(ref)).exists();
    
    const { id, ...itemData } = item;

    if (exists) {
      await updateDoc(ref, {
        ...itemData,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(ref, {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
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
    const exists = (await getDoc(ref)).exists();
    if (!exists) {
      await setDoc(ref, {
        role: msg.role,
        text: msg.text,
        ...(msg.itemIds && { itemIds: msg.itemIds }),
        timestamp: serverTimestamp()
      });
    }
  } catch (err: any) {
    handleFirestoreError(err, 'write', `users/${userId}/chats/${msg.id}`);
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
        timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString()
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

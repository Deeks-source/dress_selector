import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ClothingItem, ChatMessage } from '../types';

export const syncWardrobeItem = async (userId: string, item: ClothingItem) => {
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
};

export const deleteWardrobeItemDB = async (userId: string, itemId: string) => {
  await deleteDoc(doc(db, 'users', userId, 'wardrobe', itemId));
};

export const syncChatMessage = async (userId: string, msg: ChatMessage) => {
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
};

export const clearChatHistory = async (userId: string) => {
  const chatRef = collection(db, 'users', userId, 'chats');
  const snap = await getDocs(chatRef);
  const batch = writeBatch(db);
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

export const getOrInitUser = async (userId: string, email: string) => {
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
};

export const subscribeToMemory = (userId: string, callback: (mem: string[]) => void) => {
  return onSnapshot(doc(db, 'users', userId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().memory || []);
    }
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
  });
};

export const appendMemoryFact = async (userId: string, newFacts: string[]) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const mem = snap.data().memory || [];
    const updated = Array.from(new Set([...mem, ...newFacts]));
    await updateDoc(ref, { memory: updated, updatedAt: serverTimestamp() });
  }
};

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OperationType, type FirestoreErrorInfo } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}

export const dbService = {
  async getDocument<T>(path: string, id: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(db, path, id));
      return docSnap.exists() ? (docSnap.data() as T) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
      return null;
    }
  },

  async getCollection<T>(path: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(collection(db, path), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addDocument<T extends DocumentData>(path: string, data: T): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async setDocument<T extends DocumentData>(path: string, id: string, data: T): Promise<void> {
    try {
      await setDoc(doc(db, path, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
      throw error;
    }
  },

  async updateDocument<T extends DocumentData>(path: string, id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(db, path, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
      throw error;
    }
  },

  async deleteDocument(path: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      throw error;
    }
  }
};

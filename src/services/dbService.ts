import { auth } from '../lib/firebase';
import { OperationType, type FirestoreErrorInfo } from '../types';

async function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('API Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const dbService = {
  async getDocument<T>(path: string, id: string): Promise<T | null> {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    try {
      let endpoint = '';
      if (path.includes('trades')) endpoint = `/api/${userId}/trades/${id}`;
      else if (path.includes('settings')) endpoint = `/api/${userId}/settings`;
      else if (path.includes('checklists')) endpoint = `/api/${userId}/checklists/${id}`;
      else if (path.includes('insights')) endpoint = `/api/${userId}/insights/${id}`;
      else return null;

      const response = await fetch(endpoint);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      await handleApiError(error, OperationType.GET, `${path}/${id}`);
      return null;
    }
  },

  async getCollection<T>(path: string, _constraints: any[] = []): Promise<T[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    try {
      // Determine endpoint based on path
      let endpoint = '';
      if (path.includes('trades')) endpoint = `/api/${userId}/trades`;
      else if (path.includes('settings')) endpoint = `/api/${userId}/settings`;
      else if (path.includes('checklists')) endpoint = `/api/${userId}/checklists`;
      else if (path.includes('insights')) endpoint = `/api/${userId}/insights`;
      else return [];

      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch collection (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      await handleApiError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addDocument<T>(path: string, data: T): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    try {
      let endpoint = '';
      if (path.includes('trades')) endpoint = `/api/${userId}/trades`;
      else if (path.includes('settings')) endpoint = `/api/${userId}/settings`;
      else if (path.includes('checklists')) endpoint = `/api/${userId}/checklists`;
      else if (path.includes('insights')) endpoint = `/api/${userId}/insights`;
      else throw new Error('Invalid path');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add document (${response.status})`);
      }
      const result = await response.json();
      return result.id;
    } catch (error) {
      await handleApiError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async updateDocument<T>(path: string, id: string, data: Partial<T>): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    try {
      let endpoint = '';
      if (path.includes('trades')) endpoint = `/api/${userId}/trades/${id}`;
      else if (path.includes('settings')) endpoint = `/api/${userId}/settings`;
      else if (path.includes('checklists')) endpoint = `/api/${userId}/checklists/${id}`;
      else throw new Error('Invalid path');

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update document (${response.status})`);
      }
    } catch (error) {
      await handleApiError(error, OperationType.UPDATE, `${path}/${id}`);
      throw error;
    }
  },

  async deleteDocument(path: string, id: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    try {
      let endpoint = '';
      if (path.includes('trades')) endpoint = `/api/${userId}/trades/${id}`;
      else throw new Error('Invalid path');

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete document (${response.status})`);
      }
    } catch (error) {
      await handleApiError(error, OperationType.DELETE, `${path}/${id}`);
      throw error;
    }
  },

  // Partial support for setDocument by calling add/update logic
  async setDocument<T>(path: string, id: string, data: T): Promise<void> {
    return this.updateDocument(path, id, data as any);
  }
};


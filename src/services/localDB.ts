
type Collection = 'goals' | 'hieas' | 'projects' | 'conferences' | 'users' | 'calendar_events';

export const localDB = {
  getAll: (collection: Collection) => {
    const data = localStorage.getItem(`db_${collection}`);
    return data ? JSON.parse(data) : [];
  },

  setAll: (collection: Collection, data: any[]) => {
    localStorage.setItem(`db_${collection}`, JSON.stringify(data));
    window.dispatchEvent(new Event('local-storage-update'));
  },

  add: (collection: Collection, item: any) => {
    const items = localDB.getAll(collection);
    const newItem = { 
      ...item, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    localDB.setAll(collection, [...items, newItem]);
    return newItem;
  },

  update: (collection: Collection, id: string, data: any) => {
    const items = localDB.getAll(collection);
    const index = items.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      localDB.setAll(collection, items);
    }
  },

  delete: (collection: Collection, id: string) => {
    const items = localDB.getAll(collection);
    const filtered = items.filter((item: any) => item.id !== id);
    localDB.setAll(collection, filtered);
  }
};

export const localAuth = {
  getUser: () => {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-state-change'));
  },
  logout: () => {
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth-state-change'));
  }
};

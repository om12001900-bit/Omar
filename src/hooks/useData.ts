import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Goal, Hiea, Project, Conference, StrategicUpdate, Budget, WishlistItem, Transaction, ChangelogLog } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function useFinance() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Budget
    const qBudget = query(collection(db, 'budgets'), where('ownerId', '==', user.uid));
    const unsubBudget = onSnapshot(qBudget, (snapshot) => {
      if (!snapshot.empty) {
        setBudget({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Budget);
      } else {
        setBudget(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
      setLoading(false);
    });

    // Wishlist
    const qWishlist = query(collection(db, 'wishlist'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubWishlist = onSnapshot(qWishlist, (snapshot) => {
      setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WishlistItem[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wishlist');
      setLoading(false);
    });

    // Transactions
    const qTransactions = query(collection(db, 'transactions'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    return () => {
      unsubBudget();
      unsubWishlist();
      unsubTransactions();
    };
  }, [user]);

  return { budget, wishlist, transactions, loading };
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'goals'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })) as Goal[];
      setGoals(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { goals, loading };
}

export function useHieas() {
  const [hieas, setHieas] = useState<Hiea[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'hieas'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })) as Hiea[];
      setHieas(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hieas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { hieas, loading };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'projects'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })) as Project[];
      setProjects(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { projects, loading };
}

export function useConferences() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'conferences'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })) as Conference[];
      setConferences(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conferences');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { conferences, loading };
}

export function useStrategicUpdates() {
  const [updates, setUpdates] = useState<StrategicUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'strategic_updates'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })) as StrategicUpdate[];
      setUpdates(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'strategic_updates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { updates, loading };
}

export function useVersion() {
  const [version, setVersion] = useState<number>(1.00);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.version === 'number') {
          setVersion(data.version);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Version fetch error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { version, loading };
}

export function useChangelog() {
  const [logs, setLogs] = useState<ChangelogLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'settings', 'system', 'changelog'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChangelogLog[];
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Changelog fetch error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { logs, loading };
}

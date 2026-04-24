import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Goal, Hiea, Project, Conference } from '../types';
import { localDB } from '../services/localDB';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchData = () => {
      const allGoals = localDB.getAll('goals');
      // Filter by user if necessary, but for local simulation we might want all or user-specific
      setGoals(allGoals.filter((g: any) => g.ownerId === user.uid));
      setLoading(false);
    };

    fetchData();
    window.addEventListener('local-storage-update', fetchData);
    return () => window.removeEventListener('local-storage-update', fetchData);
  }, [user]);

  return { goals, loading };
}

export function useHieas() {
  const [hieas, setHieas] = useState<Hiea[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchData = () => {
      const allHieas = localDB.getAll('hieas');
      setHieas(allHieas.filter((h: any) => h.ownerId === user.uid));
      setLoading(false);
    };

    fetchData();
    window.addEventListener('local-storage-update', fetchData);
    return () => window.removeEventListener('local-storage-update', fetchData);
  }, [user]);

  return { hieas, loading };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchData = () => {
      const allProjects = localDB.getAll('projects');
      setProjects(allProjects.filter((p: any) => p.ownerId === user.uid));
      setLoading(false);
    };

    fetchData();
    window.addEventListener('local-storage-update', fetchData);
    return () => window.removeEventListener('local-storage-update', fetchData);
  }, [user]);

  return { projects, loading };
}

export function useConferences() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchData = () => {
      const allConfs = localDB.getAll('conferences');
      setConferences(allConfs.filter((c: any) => c.ownerId === user.uid));
      setLoading(false);
    };

    fetchData();
    window.addEventListener('local-storage-update', fetchData);
    return () => window.removeEventListener('local-storage-update', fetchData);
  }, [user]);

  return { conferences, loading };
}

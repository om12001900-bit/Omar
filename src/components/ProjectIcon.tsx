import React from 'react';
import { 
  Briefcase, 
  Activity, 
  Target, 
  TrendingUp, 
  Zap, 
  Award, 
  Cloud, 
  Cpu, 
  Globe, 
  Shield, 
  Package, 
  Terminal, 
  Users, 
  Rocket, 
  Flame,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Key,
  Database,
  Book,
  Search,
  Settings
} from 'lucide-react';

export const availableIcons = [
  { id: 'Briefcase', icon: Briefcase },
  { id: 'Activity', icon: Activity },
  { id: 'Target', icon: Target },
  { id: 'TrendingUp', icon: TrendingUp },
  { id: 'Zap', icon: Zap },
  { id: 'Award', icon: Award },
  { id: 'Cloud', icon: Cloud },
  { id: 'Cpu', icon: Cpu },
  { id: 'Globe', icon: Globe },
  { id: 'Shield', icon: Shield },
  { id: 'Package', icon: Package },
  { id: 'Terminal', icon: Terminal },
  { id: 'Users', icon: Users },
  { id: 'Rocket', icon: Rocket },
  { id: 'Flame', icon: Flame },
  { id: 'Database', icon: Database },
  { id: 'Book', icon: Book },
  { id: 'Search', icon: Search },
  { id: 'MessageSquare', icon: MessageSquare },
  { id: 'Key', icon: Key },
  { id: 'Settings', icon: Settings },
  { id: 'ListTodo', icon: ListTodo },
  { id: 'CheckCircle2', icon: CheckCircle2 },
  { id: 'Clock', icon: Clock },
  { id: 'AlertCircle', icon: AlertCircle },
];

interface ProjectIconProps {
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ProjectIcon({ name, size = 20, className = "", style }: ProjectIconProps) {
  const IconComponent = (name && availableIcons.find(i => i.id === name)?.icon) || Briefcase;
  return <IconComponent size={size} className={className} style={style} />;
}

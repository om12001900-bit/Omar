export enum GoalType {
  OBJECTIVE = 'objective',
  TARGET = 'target'
}

export enum GoalCategory {
  OV9 = 'OV9',
  S15 = 'S15'
}

export enum ProjectStatus {
  UPCOMING = 'upcoming',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed'
}

export interface Milestone {
  id: number;
  title: string;
  completed: boolean;
  date: string;
}

export interface UserSettings {
  themeColor: string;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'full';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  settings?: UserSettings;
  createdAt: any;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  startDate: string;
  endDate: string;
  hieaId: string;
  projectId?: string;
  category: GoalCategory;
  progress: number;
  milestones: Milestone[];
  ownerId: string;
  createdAt: any;
}

export interface Hiea {
  id: string;
  name: string;
  laws: string;
  procedures: string;
  achievements?: string;
  logoUrl?: string;
  color?: string;
  progress?: number;
  goalIds?: string[];
  ownerId: string;
  createdAt: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progress: number;
  milestones: Milestone[];
  hieaId?: string;
  goalId?: string;
  tags?: string[];
  icon?: string;
  ownerId: string;
  createdAt: any;
}

export interface Conference {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  hieaId?: string;
  projectId?: string;
  goalId?: string;
  description: string;
  agenda?: string;
  ownerId: string;
  createdAt: any;
}

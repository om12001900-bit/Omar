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
  PENDING_COMPLETION = 'pending_completion',
  COMPLETED = 'completed'
}

export interface Milestone {
  id: number;
  title: string;
  completed: boolean;
  date: string;
  notes?: string;
}

export interface UserSettings {
  themeColor: string;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'full';
  defaultCalendarView?: 'grid' | 'agenda';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirestoreTimestamp = any;

export interface DailyReviewConfig {
  itemId: string;
  type: 'goal' | 'hiea' | 'project';
  startDate: string;
  endDate: string;
  planId?: string; // Legacy
  stageId?: string; // Legacy
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  settings?: UserSettings;
  lastCheckInDate?: string; // YYYY-MM-DD
  dailyReviewItems?: DailyReviewConfig[];
  integrations?: {
    googleCalendar?: {
      linked: boolean;
      lastSync?: string;
      email?: string;
    };
    outlookCalendar?: {
      linked: boolean;
      lastSync?: string;
    };
  };
  createdAt: FirestoreTimestamp;
}

export interface PerformanceLog {
  id: string;
  value: number; // For relative: delta. For cumulative: total.
  type?: 'relative' | 'cumulative' | 'arrow';
  indicator?: 'positive' | 'negative';
  impact?: 'positive' | 'negative';
  note: string;
  date: string;
  recordedBy: string;
  recordedAt: FirestoreTimestamp;
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
  kpiTitle?: string;
  kpiTarget?: number;
  kpiCurrent?: number;
  kpiUnit?: string;
  milestones: Milestone[];
  performanceLogs?: PerformanceLog[];
  ownerId: string;
  createdAt: FirestoreTimestamp;
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
  performanceLogs?: PerformanceLog[];
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

export interface ProjectSubGoal {
  id: string;
  title: string;
  progress: number;
  indicator?: 'positive' | 'negative' | 'stable';
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
  subGoals?: ProjectSubGoal[]; 
  challenges?: string[];
  requiredResources?: string[];
  priority?: 'high' | 'medium' | 'low';
  performanceLogs?: PerformanceLog[];
  hieaId?: string;
  hieaIds?: string[];
  goalId?: string;
  kpiTitle?: string;
  kpiTarget?: number;
  kpiCurrent?: number;
  kpiUnit?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  dependencies?: string[];
  ownerId: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Conference {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  hieaId?: string;
  hieaIds?: string[];
  projectId?: string;
  goalId?: string;
  description: string;
  agenda?: string;
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

export interface StrategicUpdate {
  id: string;
  title: string;
  content: string;
  type: 'milestone' | 'goal' | 'project' | 'general';
  entityId: string;
  entityName: string;
  icon?: string;
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: 'cash' | 'digital';
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  isBought: boolean;
  status: 'desire' | 'bought';
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

export interface Budget {
  id: string;
  total: number;
  cash: number;
  digital: number;
  ownerId: string;
  updatedAt: FirestoreTimestamp;
}

export interface ChangelogLog {
  id: string;
  version: string;
  description: string;
  timestamp: FirestoreTimestamp;
}

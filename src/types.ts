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
}

export interface UserSettings {
  themeColor: string;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'full';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirestoreTimestamp = any;

export interface DailyReviewConfig {
  itemId: string;
  type: 'goal' | 'plan_goal' | 'hiea' | 'project';
  startDate: string;
  endDate: string;
  planId?: string; // For plan_goals
  stageId?: string; // For plan_goals
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
  createdAt: FirestoreTimestamp;
}

export interface PerformanceLog {
  id: string;
  value: number; // For relative: delta. For cumulative: total.
  type?: 'relative' | 'cumulative';
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

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progress: number;
  milestones: Milestone[];
  performanceLogs?: PerformanceLog[];
  hieaId?: string;
  hieaIds?: string[];
  goalId?: string;
  tags?: string[];
  icon?: string;
  ownerId: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface PlanStage {
  id: string;
  title: string;
  goals: { 
    id: string; 
    text: string; 
    completed: boolean;
    kpiTitle?: string;
    kpiTarget?: number;
    kpiCurrent?: number;
    kpiUnit?: string;
  }[];
  startDate: string;
  endDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Plan {
  id: string;
  hieaId?: string; // Optional for general plans
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  stages: PlanStage[];
  performanceIndicator: number; // User-input target/result
  progress: number; // Calculated progress from goals (0-100)
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
  projectId?: string;
  goalId?: string;
  description: string;
  agenda?: string;
  ownerId: string;
  createdAt: FirestoreTimestamp;
}

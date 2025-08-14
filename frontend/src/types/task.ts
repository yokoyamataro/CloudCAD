export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  projectId: string;
  labels?: string[];
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface TaskFilter {
  status?: Task['status'][];
  priority?: Task['priority'][];
  assigneeId?: string[];
  labels?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  searchText?: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  completed: number;
  overdue: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byAssignee: {
    [userId: string]: {
      name: string;
      total: number;
      completed: number;
    };
  };
}
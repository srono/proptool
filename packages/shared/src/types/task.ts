export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  deal_id: string | null;
  assigned_to: string;
  title: string;
  due_at: string;
  completed_at: string | null;
  priority: TaskPriority;
  created_at: string;
}

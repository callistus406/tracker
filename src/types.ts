export type Status = 'not_started' | 'in_progress' | 'completed'

export interface Target {
  _id: string
  title: string
  description: string
  status: Status
  createdAt: string
  updatedAt: string
}
export interface DailyTarget extends Target {
  date: string
  /** Optional reminder time, "HH:MM" (24h, local). */
  remindAt?: string
}
export interface WeeklyTarget extends Target {
  weekStartDate: string
  weekEndDate: string
}

export interface Summary {
  key: string
  total: number
  completed: number
  inProgress: number
  remaining: number
  percent: number
}

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
}
export const STATUSES = Object.keys(STATUS_LABEL) as Status[]

export const CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'bills', label: 'Bills' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'health', label: 'Health' },
  { id: 'fun', label: 'Fun' },
  { id: 'other', label: 'Other' },
] as const
export type Category = (typeof CATEGORIES)[number]['id']
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<Category, string>

export interface Expense {
  _id: string
  /** In major currency units (e.g. dollars), at most 2 decimals. */
  amount: number
  category: Category
  note: string
  /** YYYY-MM-DD, local time. */
  date: string
  createdAt: string
  updatedAt: string
}

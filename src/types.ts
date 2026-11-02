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

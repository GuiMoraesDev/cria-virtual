import type { Task } from '../../types'

export type TaskChange = {
  taskId: string
  status?: Task['status'] | 'deleted'
  activeForm?: string
  subject?: string
}

export function addTask(list: Task[], task: Task): Task[] {
  return [...list, task]
}

export function updateTask(list: Task[], { taskId, status, activeForm, subject }: TaskChange): Task[] {
  if (status === 'deleted') return list.filter(task => task.id !== taskId)
  return list.map(task =>
    task.id === taskId
      ? { ...task, label: activeForm ?? subject ?? task.label, status: status ?? task.status }
      : task,
  )
}

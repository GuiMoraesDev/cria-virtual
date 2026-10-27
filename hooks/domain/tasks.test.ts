import { expect, test } from 'claude-code/testing'

import type { Task } from '../../types'
import { addTask, updateTask } from './tasks'

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  label: `Task ${id}`,
  status: 'pending',
  ...overrides,
})

test('addTask appends the new task at the end of the list', () => {
  const next = addTask([task('1'), task('2')], task('3'))
  expect(next.map((t) => t.id)).toEqual(['1', '2', '3'])
})

test("a 'deleted' status removes the task with that id", () => {
  const next = updateTask([task('1'), task('2')], { taskId: '1', status: 'deleted' })
  expect(next).toEqual([task('2')])
})

test('the label takes activeForm over subject', () => {
  const [next] = updateTask([task('1')], { taskId: '1', activeForm: 'Writing tests', subject: 'Write tests' })
  expect(next?.label).toBe('Writing tests')
})

test('the label falls back to subject when there is no activeForm', () => {
  const [next] = updateTask([task('1')], { taskId: '1', subject: 'Write tests' })
  expect(next?.label).toBe('Write tests')
})

test('label and status keep their existing values when the change omits them', () => {
  const [next] = updateTask([task('1', { status: 'in_progress' })], { taskId: '1' })
  expect(next).toEqual(task('1', { status: 'in_progress' }))
})

test('the status is updated and other tasks are left untouched', () => {
  const next = updateTask([task('1'), task('2')], { taskId: '1', status: 'completed' })
  expect(next).toEqual([task('1', { status: 'completed' }), task('2')])
})

test('an unknown id leaves the list unchanged', () => {
  const list = [task('1'), task('2')]
  expect(updateTask(list, { taskId: '9', status: 'completed' })).toEqual(list)
  expect(updateTask(list, { taskId: '9', status: 'deleted' })).toEqual(list)
})

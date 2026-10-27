import { expect, test } from 'claude-code/testing'

import { humanDuration, meterColor, quotaLabel, shortModel } from './session-info'

test('shortModel drops the claude- prefix and date suffix and dots the version', () => {
  expect(shortModel('claude-opus-4-5-20251101')).toBe('opus-4.5')
})

test('shortModel keeps a single-number version as is', () => {
  expect(shortModel('claude-sonnet-5')).toBe('sonnet-5')
})

test('shortModel passes through ids it does not recognise', () => {
  expect(shortModel('gpt-x')).toBe('gpt-x')
})

test('humanDuration shows seconds under a minute', () => {
  expect(humanDuration(0)).toBe('0s')
  expect(humanDuration(59_000)).toBe('59s')
})

test('humanDuration shows whole minutes under an hour', () => {
  expect(humanDuration(60_000)).toBe('1m')
  expect(humanDuration(3_599_000)).toBe('59m')
})

test('humanDuration shows hours with zero-padded minutes', () => {
  expect(humanDuration(3_660_000)).toBe('1h01m')
  expect(humanDuration(3_600_000)).toBe('1h00m')
})

test('humanDuration clamps negative durations to 0s', () => {
  expect(humanDuration(-5_000)).toBe('0s')
})

test('meterColor is green below 50', () => {
  expect(meterColor(0)).toBe('#00BD74')
  expect(meterColor(49)).toBe('#00BD74')
})

test('meterColor turns yellow from 50', () => {
  expect(meterColor(50)).toBe('#FFBF36')
  expect(meterColor(64)).toBe('#FFBF36')
})

test('meterColor turns orange from 65', () => {
  expect(meterColor(65)).toBe('#FF8700')
  expect(meterColor(79)).toBe('#FF8700')
})

test('meterColor turns red from 80', () => {
  expect(meterColor(80)).toBe('#F36353')
  expect(meterColor(100)).toBe('#F36353')
})

test('quotaLabel names the five_hour quota session', () => {
  expect(quotaLabel('five_hour')).toBe('session')
})

test('quotaLabel names the seven_day quota weekly', () => {
  expect(quotaLabel('seven_day')).toBe('weekly')
})

test('quotaLabel passes unknown kinds through unchanged', () => {
  expect(quotaLabel('thirty_day')).toBe('thirty_day')
})

import '@testing-library/jest-dom/extend-expect'

import { render, fireEvent, screen } from '@testing-library/preact'

import { createRef } from 'react'

import TextInput from './text-input'

test('attributes should propagate', () => {
  render(<TextInput data-testid='test-input' autoFocus />)

  expect(screen.getByTestId('test-input')).toBeVisible()
  expect(screen.getByTestId('test-input').tagName).toBe('INPUT')
  expect(screen.getByTestId('test-input')).toHaveAttribute('autofocus')
})

test('forwards ref', () => {
  const ref = createRef<HTMLInputElement>()

  render(<TextInput ref={ref} />)

  expect(ref.current).not.toBeNull()
  if (ref.current === null) throw new Error()

  expect(ref.current.tagName).toBe('INPUT')
})

test('label should be visible', () => {
  const labelText = 'Label'

  render(<TextInput label={labelText} />)

  expect(screen.getByText(labelText)).toBeVisible()
  expect(screen.getByLabelText(labelText)).toBeVisible()
})

test('error text should be visible when showError', () => {
  const errorMessage = 'error message!'

  render(<TextInput error={errorMessage} showError />)

  expect(screen.getByText(errorMessage)).toBeVisible()
})

test('error text should not be visible when not showError', () => {
  const errorMessage = 'error message!'

  render(<TextInput error={errorMessage} />)

  expect(screen.queryByText(errorMessage)).not.toBeInTheDocument()
})

test('native error message is visible', async () => {
  const errorMessage = 'error message!'
  const ref = createRef<HTMLInputElement>()

  render(<TextInput ref={ref} showError />)

  expect(ref.current).not.toBeNull()
  if (ref.current === null) throw new Error()

  ref.current.setCustomValidity(errorMessage)
  fireEvent.input(ref.current)

  expect(screen.getByText(errorMessage)).toBeVisible()
})

test('reacts to "invalid" event', async () => {
  const errorMessage = 'error message!'
  const ref = createRef<HTMLInputElement>()

  render(<TextInput ref={ref} showError />)

  expect(ref.current).not.toBeNull()
  if (ref.current === null) throw new Error()

  ref.current.setCustomValidity(errorMessage)
  fireEvent.invalid(ref.current)

  expect(screen.getByText(errorMessage)).toBeVisible()
})

test('custom error message has precedence', async () => {
  const propErrorMessage = 'message from prop'
  const validationMessage = 'validation message'
  const ref = createRef<HTMLInputElement>()

  render(<TextInput ref={ref} showError error={propErrorMessage} />)

  expect(ref.current).not.toBeNull()
  if (ref.current === null) throw new Error()

  ref.current.setCustomValidity(validationMessage)
  fireEvent.input(ref.current)

  expect(screen.queryByText(validationMessage)).not.toBeInTheDocument()
  expect(screen.getByText(propErrorMessage)).toBeVisible()
})

test('updated error message is visible', async () => {
  const origErrorMessage = 'this is an error!'
  const newErrorMessage = 'oh noes!'

  const { rerender } = render(<TextInput showError error={origErrorMessage} />)

  expect(screen.getByText(origErrorMessage)).toBeVisible()
  expect(screen.queryByText(newErrorMessage)).not.toBeInTheDocument()

  rerender(<TextInput showError error={newErrorMessage} />)

  expect(screen.queryByText(origErrorMessage)).not.toBeInTheDocument()
  expect(screen.getByText(newErrorMessage)).toBeVisible()
})

test('propagates onChange event', async () => {
  const testid = 'testid'
  const onChange = jest.fn()

  render(<TextInput data-testid={testid} onChange={onChange} />)

  expect(onChange).not.toBeCalled()

  const el = screen.getByTestId(testid)

  expect(el).toBeInTheDocument()

  fireEvent.input(el)

  expect(onChange).toBeCalledTimes(1)
})

test('does not crash with boolean error and showError', async () => {
  const testid = 'testid'

  render(<TextInput data-testid={testid} error showError />)

  expect(screen.getByTestId(testid)).toBeVisible()
})

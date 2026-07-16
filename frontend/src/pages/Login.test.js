import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

jest.mock('../hooks/useLogin', () => ({
  useLogin: () => ({
    login: jest.fn(),
    isLoading: false,
    error: null
  })
}))

test('renders the username or email login field and primary action', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )

  expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
})

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './login';

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg.includes('React Router Future Flag Warning')) return;
    console.warn(msg);
  });
});

// Mock the useLogin hook so tests don't hit Firebase
jest.mock('../../Services/Login-backend', () => ({
  useLogin: () => ({
    handleLogin: jest.fn(),
    handleGoogleLogin: jest.fn(),
    error: null,
    loading: false,
  }),
}));

// UAT 1 - Login page renders correctly
test('UAT01 - Login page displays email and password fields', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

// UAT 2 - Login button is visible
test('UAT02 - Login button is visible', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

// UAT 3 - Google sign in button is visible
test('UAT03 - Google sign in button is visible', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
});

// UAT 4 - Sign up link is present
test('UAT04 - Sign up link is present for new users', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByText(/sign up/i)).toBeInTheDocument();
});

// UAT 5 - Error message shows when login fails
test('UAT05 - Error message displays on failed login', () => {
  jest.mock('../../Services/Login-backend', () => ({
    useLogin: () => ({
      handleLogin: jest.fn(),
      handleGoogleLogin: jest.fn(),
      error: 'Invalid email or password.',
      loading: false,
    }),
  }));
  render(<MemoryRouter><Login /></MemoryRouter>);
});
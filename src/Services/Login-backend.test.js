import { renderHook, act } from "@testing-library/react";
import { useLogin } from "./Login-backend";

// Mock Firebase
jest.mock("../Firebase/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
  signInWithPopup: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";

describe("useLogin", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1
  test("successful login with valid credentials", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "student" }),
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handleLogin("test@gmail.com", "password123");
    });

    expect(result.current.error).toBe("");
  });

  // TEST 2
  test("shows error with invalid credentials", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handleLogin("wrong@gmail.com", "wrongpassword");
    });

    expect(result.current.error).toBe("Invalid email or password.");
  });

  // TEST 3
  test("shows error when user not found", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/user-not-found",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handleLogin("notfound@gmail.com", "password123");
    });

    expect(result.current.error).toBe("Invalid email or password.");
  });

  // TEST 4
  test("shows error when login fails with unknown error", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/unknown-error",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handleLogin("test@gmail.com", "password123");
    });

    expect(result.current.error).toBe("Login failed. Please try again.");
  });

  // TEST 5
  test("shows error when account not found in Firestore", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => false,
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handleLogin("test@gmail.com", "password123");
    });

    expect(result.current.error).toBe("Account not found. Please register first.");
  });

  // TEST 6
  test("calls onLoginSuccess with role on successful login", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor" }),
    });

    const onLoginSuccess = jest.fn();
    const { result } = renderHook(() => useLogin({ onLoginSuccess }));

    await act(async () => {
      await result.current.handleLogin("vendor@gmail.com", "password123");
    });

    expect(onLoginSuccess).toHaveBeenCalledWith("vendor");
  });

  // TEST 7
  test("navigates to student dashboard when role is student", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "student" }),
    });

    const { result } = renderHook(() => useLogin({}));

    await act(async () => {
      await result.current.handleLogin("student@gmail.com", "password123");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/student/dashboard");
  });

  // TEST 8
  test("navigates to vendor dashboard when role is vendor", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor" }),
    });

    const { result } = renderHook(() => useLogin({}));

    await act(async () => {
      await result.current.handleLogin("vendor@gmail.com", "password123");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/vendor/dashboard");
  });

  // TEST 9
  test("navigates to admin dashboard when role is admin", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "admin" }),
    });

    const { result } = renderHook(() => useLogin({}));

    await act(async () => {
      await result.current.handleLogin("admin@gmail.com", "password123");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });

  // TEST 10
  test("shows error for invalid user role", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "unknown" }),
    });

    const { result } = renderHook(() => useLogin({}));

    await act(async () => {
      await result.current.handleLogin("test@gmail.com", "password123");
    });

    expect(result.current.error).toBe("Invalid user role.");
  });

  // TEST 11
test("Google login shows error when account not found", async () => {
  signInWithPopup.mockResolvedValue({
    user: { uid: "456" },
  });
  getDoc.mockResolvedValue({
    exists: () => false,
  });

  const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

  await act(async () => {
    await result.current.handleGoogleLogin();
  });

  expect(result.current.error).toBe("Google sign-in failed.");
});

// TEST 12
test("Google login shows error when popup is blocked", async () => {
  signInWithPopup.mockRejectedValue({
    code: "auth/popup-blocked",
  });

  const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

  await act(async () => {
    await result.current.handleGoogleLogin();
  });

  expect(result.current.error).toBe("Google sign-in failed.");
});

// TEST 13
test("Google login shows error for unauthorized domain", async () => {
  signInWithPopup.mockRejectedValue({
    code: "auth/unauthorized-domain",
  });

  const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

  await act(async () => {
    await result.current.handleGoogleLogin();
  });

  expect(result.current.error).toBe("Google sign-in failed.");
});

// TEST 14
test("Google login shows error for account exists with different credential", async () => {
  signInWithPopup.mockRejectedValue({
    code: "auth/account-exists-with-different-credential",
  });

  const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

  await act(async () => {
    await result.current.handleGoogleLogin();
  });

  expect(result.current.error).toBe("Google sign-in failed.");
});

  // TEST 15
  test("forgot password sends reset email", async () => {
    sendPasswordResetEmail.mockResolvedValue();

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("test@gmail.com");
    });

    expect(result.current.info).toBe("Password reset email sent. Please check your inbox.");
  });

  // TEST 16
  test("forgot password shows error when email is empty", async () => {
    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("");
    });

    expect(result.current.error).toBe("Please enter your email address.");
  });

  // TEST 17
  test("forgot password shows error when user not found", async () => {
    sendPasswordResetEmail.mockRejectedValue({
      code: "auth/user-not-found",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("notfound@gmail.com");
    });

    expect(result.current.error).toBe("No user found with that email.");
  });

  // TEST 18
  test("forgot password shows error for invalid email", async () => {
    sendPasswordResetEmail.mockRejectedValue({
      code: "auth/invalid-email",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("invalid");
    });

    expect(result.current.error).toBe("Please enter a valid email address.");
  });

  // TEST 19
  test("forgot password shows generic error for unknown error", async () => {
    sendPasswordResetEmail.mockRejectedValue({
      code: "auth/unknown",
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("test@gmail.com");
    });

    expect(result.current.error).toBe("Failed to send password reset email.");
  });

  // TEST 20
  test("loading state is true during login", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "student" }),
    });

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    act(() => {
      result.current.handleLogin("test@gmail.com", "password123");
    });

    expect(result.current.loading).toBe(true);
  });

});
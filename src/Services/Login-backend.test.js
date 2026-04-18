import { renderHook, act } from "@testing-library/react";
import { useLogin } from "./Login-backend";

// Mock Firebase
jest.mock("../Firebase/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
  test("forgot password sends reset email", async () => {
    sendPasswordResetEmail.mockResolvedValue();

    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("test@gmail.com");
    });

    expect(result.current.error).toBe("Password reset email sent. Please check your inbox.");
  });

  // TEST 4
  test("forgot password shows error when email is empty", async () => {
    const { result } = renderHook(() => useLogin({ onLoginSuccess: jest.fn() }));

    await act(async () => {
      await result.current.handlePasswordReset("");
    });
     expect(result.current.error).toBe("Please enter your email address.");
  });

});
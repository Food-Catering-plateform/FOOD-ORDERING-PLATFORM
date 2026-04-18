import { renderHook, act } from "@testing-library/react";
import useRegister from "./Register";

// Mock Firebase
jest.mock("../Firebase/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore";

describe("useRegister", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1
  test("successful registration as student", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });
    setDoc.mockResolvedValue();

    const { result } = renderHook(() => useRegister("student"));

    await act(async () => {
      result.current.setName("Test User");
      result.current.setLastName("Doe");
      result.current.setEmail("test@gmail.com");
      result.current.setPassword("password123");
      result.current.setStudentNumber("ST001");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe("");
  });

  // TEST 2
  test("successful registration as vendor", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "456" },
    });
    setDoc.mockResolvedValue();

    const { result } = renderHook(() => useRegister("vendor"));

    await act(async () => {
      result.current.setName("Vendor User");
      result.current.setLastName("Smith");
      result.current.setEmail("vendor@gmail.com");
      result.current.setPassword("password123");
      result.current.setBusinessName("Food Place");
      result.current.setStaffNumber("ST123");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe("");
  });

  // TEST 3
  test("shows error when email already exists", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    const { result } = renderHook(() => useRegister("student"));

    await act(async () => {
      result.current.setEmail("existing@gmail.com");
      result.current.setPassword("password123");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe("An account with this email already exists. Please log in.");
  });

  // TEST 4
  test("shows error for invalid email", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-email",
    });

    const { result } = renderHook(() => useRegister("student"));

    await act(async () => {
      result.current.setEmail("invalid-email");
      result.current.setPassword("password123");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe("Please enter a valid email address.");
  });

  // TEST 5
  test("shows error for weak password", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/weak-password",
    });

    const { result } = renderHook(() => useRegister("student"));

    await act(async () => {
      result.current.setEmail("test@gmail.com");
      result.current.setPassword("123");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe("Password must be at least 6 characters.");
  });

  // TEST 6
  test("saves user data to Firestore on registration", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "789" },
    });
    setDoc.mockResolvedValue();

    const { result } = renderHook(() => useRegister("student"));

    await act(async () => {
      result.current.setName("New User");
      result.current.setEmail("new@gmail.com");
      result.current.setPassword("password123");
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault: () => {} });
    });

    expect(setDoc).toHaveBeenCalled();
  });

});
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";

// Mock Firebase
jest.mock("../../Firebase/firebaseConfig", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

import { sendPasswordResetEmail } from "firebase/auth";

describe("ForgotPassword", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1
  test("renders forgot password page", () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
  });

  // TEST 2
  test("shows success message when email is sent", async () => {
    sendPasswordResetEmail.mockResolvedValue();

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "test@gmail.com" },
    });

    fireEvent.click(screen.getByText("Send Reset Email"));

    await waitFor(() => {
      expect(screen.getByText("Password reset email sent! Please check your inbox.")).toBeInTheDocument();
    });
  });

  // TEST 3
  test("shows error message when email fails", async () => {
    sendPasswordResetEmail.mockRejectedValue(new Error("Failed"));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "wrong@gmail.com" },
    });

    fireEvent.click(screen.getByText("Send Reset Email"));

    await waitFor(() => {
      expect(screen.getByText("Failed to send reset email. Check your email address.")).toBeInTheDocument();
    });
  });

  // TEST 4
  test("shows back to login link", () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText("Back to Login")).toBeInTheDocument();
  });

});
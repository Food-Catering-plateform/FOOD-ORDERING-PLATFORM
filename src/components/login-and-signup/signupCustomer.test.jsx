import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "../../Services/Register";
import SignupCustomer from "./signupCustomer";

jest.mock("../../Services/Register", () => jest.fn());

const buildRegisterState = (overrides = {}) => ({
  handleRegister: jest.fn(),
  name: "",
  setName: jest.fn(),
  lastName: "",
  setLastName: jest.fn(),
  studentNumber: "",
  setStudentNumber: jest.fn(),
  email: "",
  setEmail: jest.fn(),
  password: "",
  setPassword: jest.fn(),
  error: "",
  ...overrides,
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <SignupCustomer />
    </MemoryRouter>
  );

describe("SignupCustomer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Register.mockReturnValue(buildRegisterState());
  });

  test("renders all customer signup fields and login link", () => {
    renderComponent();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/student number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/");
  });

  test("initializes Register service for student role", () => {
    renderComponent();
    expect(Register).toHaveBeenCalledWith("student");
  });

  test("updates form values using Register setters", () => {
    const state = buildRegisterState();
    Register.mockReturnValue(state);
    renderComponent();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Sam" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Moyo" } });
    fireEvent.change(screen.getByLabelText(/student number/i), { target: { value: "ST123" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@uni.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });

    expect(state.setName).toHaveBeenCalledWith("Sam");
    expect(state.setLastName).toHaveBeenCalledWith("Moyo");
    expect(state.setStudentNumber).toHaveBeenCalledWith("ST123");
    expect(state.setEmail).toHaveBeenCalledWith("sam@uni.com");
    expect(state.setPassword).toHaveBeenCalledWith("secret123");
  });

  test("submits form and calls handleRegister with student role", () => {
    const state = buildRegisterState();
    Register.mockReturnValue(state);
    renderComponent();

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form"));

    expect(state.handleRegister).toHaveBeenCalledTimes(1);
    expect(state.handleRegister.mock.calls[0][1]).toBe("student");
  });

  test("shows error alert when Register returns an error", () => {
    Register.mockReturnValue(buildRegisterState({ error: "Email already exists" }));
    renderComponent();

    expect(screen.getByRole("alert")).toHaveTextContent("Email already exists");
  });
});
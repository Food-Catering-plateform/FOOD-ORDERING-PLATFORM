import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "../../Services/Register";
import SignupVendor from "./signupVendor";

jest.mock("../../Services/Register", () => jest.fn());

const buildRegisterState = (overrides = {}) => ({
  handleRegister: jest.fn(),
  name: "",
  setName: jest.fn(),
  lastName: "",
  setLastName: jest.fn(),
  staffNumber: "",
  setStaffNumber: jest.fn(),
  businessName: "",
  setBusinessName: jest.fn(),
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
      <SignupVendor />
    </MemoryRouter>
  );

describe("SignupVendor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Register.mockReturnValue(buildRegisterState());
  });

  test("renders all vendor signup fields", () => {
    renderComponent();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/staff number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  test("initializes Register service for vendor role", () => {
    renderComponent();
    expect(Register).toHaveBeenCalledWith("vendor");
  });

  test("updates form values through Register setters", () => {
    const state = buildRegisterState();
    Register.mockReturnValue(state);
    renderComponent();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ava" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Dean" } });
    fireEvent.change(screen.getByLabelText(/staff number/i), { target: { value: "SF42" } });
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: "Ava Cafe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "owner@cafe.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "abc12345" } });

    expect(state.setName).toHaveBeenCalledWith("Ava");
    expect(state.setLastName).toHaveBeenCalledWith("Dean");
    expect(state.setStaffNumber).toHaveBeenCalledWith("SF42");
    expect(state.setBusinessName).toHaveBeenCalledWith("Ava Cafe");
    expect(state.setEmail).toHaveBeenCalledWith("owner@cafe.com");
    expect(state.setPassword).toHaveBeenCalledWith("abc12345");
  });

  test("submits form and passes vendor role to handleRegister", () => {
    const state = buildRegisterState();
    Register.mockReturnValue(state);
    renderComponent();

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form"));

    expect(state.handleRegister).toHaveBeenCalledTimes(1);
    expect(state.handleRegister.mock.calls[0][1]).toBe("vendor");
  });

  test("renders error alert when an error exists", () => {
    Register.mockReturnValue(buildRegisterState({ error: "Invalid staff number" }));
    renderComponent();

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid staff number");
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/");
  });
});

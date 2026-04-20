import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignupCustomer from "./signupCustomer";


jest.mock("../../Services/Register", () => {
  return jest.fn(() => ({
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
    error: ""
  }));
});

describe("SignupCustomer Component", () => {

  test("renders signup form fields", () => {
    render(
      <MemoryRouter>
        <SignupCustomer />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/student number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("renders submit button", () => {
    render(
      <MemoryRouter>
        <SignupCustomer />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /create account/i }))
      .toBeInTheDocument();
  });

  test("allows user to type into inputs", () => {
    render(
      <MemoryRouter>
        <SignupCustomer />
      </MemoryRouter>
    );

    const firstNameInput = screen.getByLabelText(/first name/i);

    fireEvent.change(firstNameInput, {
      target: { value: "Simphiwe" }
    });

    expect(firstNameInput.value).toBe("Simphiwe");
  });

  test("submits the form", () => {
    const mockHandleRegister = jest.fn();

    // override mock for this test
    require("../../Services/Register").mockReturnValue({
      handleRegister: mockHandleRegister,
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
      error: ""
    });

    render(
      <MemoryRouter>
        <SignupCustomer />
      </MemoryRouter>
    );

    const form = screen.getByRole("button", { name: /create account/i });

    fireEvent.click(form);

    expect(mockHandleRegister).toHaveBeenCalled();
  });

  test("renders login link", () => {
    render(
      <MemoryRouter>
        <SignupCustomer />
      </MemoryRouter>
    );

    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

});
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignupRole from "./signup-role";

describe("SignupRole Component", () => {
  test("renders page headings and helper text", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
    expect(screen.getByText(/select your role to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/join unieats/i)).toBeInTheDocument();
  });

  test("renders all role option links", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /sign up as customer/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up as vendor/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /apply for admin access/i })).toBeInTheDocument();
  });

  test("links point to correct routes", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    const customerLink = screen.getByRole("link", { name: /sign up as customer/i });
    const vendorLink = screen.getByRole("link", { name: /sign up as vendor/i });
    const adminLink = screen.getByRole("link", { name: /apply for admin access/i });

    expect(customerLink).toHaveAttribute("href", "/signup-customer");
    expect(vendorLink).toHaveAttribute("href", "/signup-vendor");
    expect(adminLink).toHaveAttribute("href", "/signup-admin");
  });

  test("renders login link", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/");
  });
});
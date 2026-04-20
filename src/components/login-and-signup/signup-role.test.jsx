import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignupRole from "./signup-role";

describe("SignupRole Component", () => {

  test("renders main heading", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });

  test("renders role selection buttons", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByText(/sign up as customer/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up as vendor/i)).toBeInTheDocument();
  });

  test("links point to correct routes", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    const customerLink = screen.getByText(/sign up as customer/i);
    const vendorLink = screen.getByText(/sign up as vendor/i);

    expect(customerLink).toHaveAttribute("href", "/signup-customer");
    expect(vendorLink).toHaveAttribute("href", "/signup-vendor");
  });

  test("renders login link", () => {
    render(
      <MemoryRouter>
        <SignupRole />
      </MemoryRouter>
    );

    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

});
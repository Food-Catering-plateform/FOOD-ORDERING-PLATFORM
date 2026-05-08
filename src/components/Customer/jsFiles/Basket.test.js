import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Basket from "./Basket";
import { useAuth } from "../../../Services/AuthContext";

jest.mock("../../../Services/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockBasket = [
  { id: "1", name: "Burger", price: "50", qty: 2, vendorId: "v1", vendorName: "Burger Shack" },
];

describe("Basket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({
      currentUser: {
        uid: "user123",
        email: "student@gmail.com",
        displayName: "Test Student",
      },
    });
  });

  test("renders basket item details and total", () => {
    render(<Basket basket={mockBasket} setBasket={jest.fn()} setActivePage={jest.fn()} />);

    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Burger Shack")).toBeInTheDocument();
    expect(screen.getByText(/total: r 100.00/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checkout/i })).toBeInTheDocument();
  });

  test("shows empty state when basket is empty", () => {
    render(<Basket basket={[]} setBasket={jest.fn()} setActivePage={jest.fn()} />);
    expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
  });

  test("increase quantity updates basket state using updater function", () => {
    const setBasket = jest.fn();
    render(<Basket basket={mockBasket} setBasket={setBasket} setActivePage={jest.fn()} />);

    fireEvent.click(screen.getByText("+"));

    const updater = setBasket.mock.calls[0][0];
    const updated = updater(mockBasket);
    expect(updated[0].qty).toBe(3);
  });

  test("decrease quantity removes item when qty reaches zero", () => {
    const setBasket = jest.fn();
    const singleQtyBasket = [{ ...mockBasket[0], qty: 1 }];
    render(<Basket basket={singleQtyBasket} setBasket={setBasket} setActivePage={jest.fn()} />);

    fireEvent.click(screen.getByText("−"));

    const updater = setBasket.mock.calls[0][0];
    const updated = updater(singleQtyBasket);
    expect(updated).toEqual([]);
  });

  test("remove button filters selected item out", () => {
    const setBasket = jest.fn();
    render(<Basket basket={mockBasket} setBasket={setBasket} setActivePage={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    const updater = setBasket.mock.calls[0][0];
    const updated = updater([...mockBasket, { ...mockBasket[0], id: "2" }]);
    expect(updated).toEqual([{ ...mockBasket[0], id: "2" }]);
  });

  test("checkout stores pending payment and navigates to payment", () => {
    const setActivePage = jest.fn();
    render(<Basket basket={mockBasket} setBasket={jest.fn()} setActivePage={setActivePage} />);

    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));

    const pendingPayment = JSON.parse(localStorage.getItem("pendingPayment"));
    expect(pendingPayment).toMatchObject({
      customerId: "user123",
      customerEmail: "student@gmail.com",
      customerName: "Test Student",
      total: 100,
    });
    expect(setActivePage).toHaveBeenCalledWith("payment");
  });

  test("checkout exits early when user has no email", () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const setActivePage = jest.fn();
    useAuth.mockReturnValue({
      currentUser: { uid: "user123", email: "", displayName: "Test Student" },
    });

    render(<Basket basket={mockBasket} setBasket={jest.fn()} setActivePage={setActivePage} />);
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));

    expect(alertSpy).toHaveBeenCalled();
    expect(localStorage.getItem("pendingPayment")).toBeNull();
    expect(setActivePage).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
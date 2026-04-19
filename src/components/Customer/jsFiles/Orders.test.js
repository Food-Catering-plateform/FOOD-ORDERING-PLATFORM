import { render, screen } from "@testing-library/react";
import Orders from "./Orders";

// Mock Firebase
jest.mock("../../../Firebase/firebaseConfig", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
}));

jest.mock("../../../Services/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../../../Services/AuthContext";
import { onSnapshot } from "firebase/firestore";

describe("Orders", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1
  test("shows loading when auth is loading", () => {
    useAuth.mockReturnValue({ currentUser: null, authLoading: true });

    render(<Orders />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // TEST 2
  test("shows no orders message when user has no orders", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({ docs: [] });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("You have no orders yet.")).toBeInTheDocument();
  });

  // TEST 3
  test("shows order with pending status on step 1", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order1",
          data: () => ({
            vendorName: "Test Shop",
            status: "pending",
            time: "2026/04/19",
            total: 100,
            items: [{ name: "Burger", price: 50, qty: 2 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Test Shop")).toBeInTheDocument();
    expect(screen.getByText("Order Received")).toBeInTheDocument();
  });

  // TEST 4
  test("shows order with preparing status on step 2", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order2",
          data: () => ({
            vendorName: "Test Shop",
            status: "preparing",
            time: "2026/04/19",
            total: 50,
            items: [{ name: "Pizza", price: 50, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Preparing")).toBeInTheDocument();
  });

  // TEST 5
  test("shows order with ready status on step 3", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order3",
          data: () => ({
            vendorName: "Test Shop",
            status: "ready",
            time: "2026/04/19",
            total: 75,
            items: [{ name: "Salad", price: 75, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();
  });

  // TEST 6
  test("shows correct total price", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order4",
          data: () => ({
            vendorName: "Test Shop",
            status: "pending",
            time: "2026/04/19",
            total: 184.98,
            items: [{ name: "Fish", price: 23, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Total: R 184.98")).toBeInTheDocument();
  });

});
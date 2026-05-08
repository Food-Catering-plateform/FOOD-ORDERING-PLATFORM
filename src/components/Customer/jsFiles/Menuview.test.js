import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MenuView from "./MenuView";
import { collection, getDocs } from "firebase/firestore";

jest.mock("../../../Firebase/firebaseConfig", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

const mockShop = {
  id: "vendor-1",
  name: "Matrix Grill",
  category: "Fast Food",
};

const createSnapshot = (items) => ({
  forEach: (callback) => {
    items.forEach((item) => callback({ id: item.id, data: () => item }));
  },
});

describe("MenuView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocs.mockResolvedValue(
      createSnapshot([
        { id: "m1", name: "Burger", price: 55, description: "Cheese burger", qty: 1 },
      ])
    );
  });

  test("renders shop name and fetches menu items", async () => {
    render(<MenuView shop={mockShop} onBack={jest.fn()} addToBasket={jest.fn()} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Matrix Grill Menu");
    expect(collection).toHaveBeenCalledWith({}, "Vendors", "vendor-1", "menuItems");

    await waitFor(() => expect(screen.getByText("Burger")).toBeInTheDocument());
    expect(screen.getByText("Cheese burger")).toBeInTheDocument();
    expect(screen.getByText("R55")).toBeInTheDocument();
    expect(screen.getByText(/qty: 1/i)).toBeInTheDocument();
  });

  test("does not fetch menu when shop id is missing", async () => {
    render(<MenuView shop={{ name: "Unknown Shop" }} onBack={jest.fn()} addToBasket={jest.fn()} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Unknown Shop Menu");

    await waitFor(() => {
      expect(getDocs).not.toHaveBeenCalled();
    });
  });

  test("calls onBack when back button is clicked", () => {
    const onBack = jest.fn();
    render(<MenuView shop={mockShop} onBack={onBack} addToBasket={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /back to shops/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("adds item to basket and toggles Added state", async () => {
    jest.useFakeTimers();
    const addToBasket = jest.fn();
    render(<MenuView shop={mockShop} onBack={jest.fn()} addToBasket={addToBasket} />);

    const addBtn = await screen.findByRole("button", { name: /add to basket/i });
    fireEvent.click(addBtn);

    expect(addToBasket).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", name: "Burger" }),
      mockShop
    );
    expect(screen.getByRole("button", { name: /added!/i })).toBeInTheDocument();

    jest.advanceTimersByTime(1000);
    expect(await screen.findByRole("button", { name: /add to basket/i })).toBeInTheDocument();
    jest.useRealTimers();
  });
});
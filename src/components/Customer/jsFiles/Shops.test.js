import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Shops from "./Shops";
import { collection, getDocs } from "firebase/firestore";

jest.mock("../../../Assets/logo2.png", () => "mock-logo.png");
jest.mock("../../../Firebase/firebaseConfig", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

const mockSnapshot = {
  forEach: (callback) => {
    [
      {
        id: "v1",
        businessName: "Test Grill",
        category: "Fast Food",
        description: "Tasty food",
        imageURL: "test.jpg",
      },
    ].forEach((vendor) => callback({ id: vendor.id, data: () => vendor }));
  },
};

describe("Shops", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocs.mockResolvedValue(mockSnapshot);
  });

  test("renders welcome heading and section title", () => {
    render(<Shops onSelectShop={jest.fn()} />);

    expect(screen.getByText(/welcome to/i)).toBeInTheDocument();
    expect(screen.getByText(/list of all vendors and their menus/i)).toBeInTheDocument();
    expect(screen.getByAltText(/unieats logo/i)).toBeInTheDocument();
  });

  test("fetches vendors from firestore and renders vendor card", async () => {
    render(<Shops onSelectShop={jest.fn()} />);

    expect(collection).toHaveBeenCalledWith({}, "Vendors");
    await waitFor(() => expect(screen.getByText("Test Grill")).toBeInTheDocument());
    expect(screen.getByText("Tasty food")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Test Grill" })).toHaveAttribute("src", "test.jpg");
  });

  test("calls onSelectShop with selected vendor", async () => {
    const onSelectShop = jest.fn();
    render(<Shops onSelectShop={onSelectShop} />);

    const button = await screen.findByRole("button", { name: /view menu/i });
    fireEvent.click(button);

    expect(onSelectShop).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "v1",
        name: "Test Grill",
        category: "Fast Food",
      })
    );
  });
});
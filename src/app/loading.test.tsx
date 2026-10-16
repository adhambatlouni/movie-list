import { afterEach, expect, it } from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import { cleanup, render, screen } from "@testing-library/react";
import Loading from "./loading";

afterEach(cleanup);

it("announces route loading and renders skeletons without interactive placeholder controls", () => {
  render(<Loading />);
  expect(screen.getByRole("status", { name: "Loading movies" })).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

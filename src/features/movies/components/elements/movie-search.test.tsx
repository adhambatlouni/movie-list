/** @jest-environment jsdom */
import { afterEach, beforeEach, expect, it, jest } from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MovieSearch } from "./movie-search";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

it("keeps typing immediate and commits only after 300 ms without input", () => {
  const onChange = jest.fn();
  render(<MovieSearch value="" onChange={onChange} />);
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "arr" } });
  act(() => jest.advanceTimersByTime(200));
  fireEvent.change(input, { target: { value: "arrival" } });
  expect(input).toHaveValue("arrival");
  act(() => jest.advanceTimersByTime(299));
  expect(onChange).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("arrival");
});

it("clears immediately and cancels any pending search", () => {
  const onChange = jest.fn();
  render(<MovieSearch value="arrival" onChange={onChange} />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "perfect" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Clear title search" }));
  expect(screen.getByRole("searchbox")).toHaveValue("");
  act(() => jest.advanceTimersByTime(300));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("");
});

it("discards pending typing when navigation supplies another URL value", () => {
  const onChange = jest.fn();
  const { rerender, unmount } = render(
    <MovieSearch value="arrival" onChange={onChange} />,
  );
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "draft" },
  });
  rerender(<MovieSearch value="perfect" onChange={onChange} />);
  expect(screen.getByRole("searchbox")).toHaveValue("perfect");
  act(() => jest.advanceTimersByTime(300));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "unfinished" },
  });
  unmount();
  act(() => jest.advanceTimersByTime(300));
  expect(onChange).not.toHaveBeenCalled();
});

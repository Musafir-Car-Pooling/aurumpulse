import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallApp } from "@/components/InstallApp";

const nativeInstall = (outcome: "accepted" | "dismissed" = "accepted") => {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => { window.dispatchEvent(event); });
  return { event, prompt };
};

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("home-screen installation", () => {
  it("defers native installation until the user chooses Install", async () => {
    render(<InstallApp />);
    const { event, prompt } = nativeInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Install app" }).at(-1) as HTMLElement);
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });

  it("dismissal does not trigger installation or repeat automatic popups in the session", () => {
    render(<InstallApp />);
    const { prompt } = nativeInstall();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(sessionStorage.getItem("ap-install-dismissed")).toBe("1");
    expect(prompt).not.toHaveBeenCalled();
    nativeInstall();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stops offering installation after the browser reports success", () => {
    render(<InstallApp />);
    nativeInstall();
    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });
});
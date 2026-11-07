import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppMenu } from "@/components/AppMenu";

type MenuProps = React.ComponentProps<typeof AppMenu>;

// A two-page route tree is enough for the menu's links; the app's real routes
// run loaders and server calls the menu test does not need.
function menuTree(props: MenuProps) {
  const root = createRootRoute({ component: () => <Outlet /> });
  return root.addChildren([
    createRoute({ getParentRoute: () => root, path: "/", component: () => <AppMenu {...props} /> }),
    createRoute({ getParentRoute: () => root, path: "/auth", component: () => null }),
    createRoute({ getParentRoute: () => root, path: "/packages", component: () => null }),
    createRoute({ getParentRoute: () => root, path: "/mt5", component: () => null }),
    createRoute({ getParentRoute: () => root, path: "/admin", component: () => null }),
  ]);
}

async function openMenu(props: MenuProps) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree: menuTree(props),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient },
  });
  await router.load();
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  await screen.findByText("AURUMPULSE");
}

afterEach(() => { cleanup(); });

describe("side menu when premium is off", () => {
  it("offers sign in to a visitor who is not signed in", async () => {
    await openMenu({ status: "Free access", isAdmin: false, premium: false, signedIn: false });
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in or create account/i })).toHaveAttribute("href", "/auth");
    expect(screen.queryByRole("button", { name: /Sign out/i })).toBeNull();
  });

  it("still shows sign out for a member signed in while premium is off", async () => {
    await openMenu({ email: "member@example.com", status: "Free access", isAdmin: false, premium: false, signedIn: true });
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sign in or create account/i })).toBeNull();
  });

  it("hides packages and MT5 but keeps the admin panel for an admin", async () => {
    await openMenu({ email: "pp@gmail.com", status: "Admin", isAdmin: true, premium: false, signedIn: true });
    expect(screen.queryByRole("link", { name: /Premium packages/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Connect MT5/i })).toBeNull();
    expect(screen.getByRole("link", { name: /Admin panel/i })).toBeInTheDocument();
  });
});

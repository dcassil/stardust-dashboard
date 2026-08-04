/**
 * DASH-T-0008 — command + extension registry tests.
 *
 * TC-001 (command register / when-filter / unmount cleanup), TC-002 (duplicate-id
 * guard), TC-003 (reserved-kind guard), TC-004 (per-kind narrow subscription).
 * Driven through AdminProvider (which mounts both registries) with a fake store.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider } from "./AdminProvider.js";
import {
  useCommands,
  useRegisterCommand,
  useExtensions,
  useRegisterExtension,
} from ".";
import type { Command } from "./adminTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

const commandA: Command = {
  id: "A",
  title: "A",
  run: () => undefined,
  when: (ctx) => (ctx as { editing?: boolean }).editing === true,
};

describe("DASH-T-0008 — command register / when-filter / unmount (TC-001)", () => {
  it("filters by when(ctx) and cleans up on unmount", () => {
    const included: { current: readonly Command[] } = { current: [] };
    const excluded: { current: readonly Command[] } = { current: [] };

    function Register(): ReactNode {
      useRegisterCommand(commandA);
      return null;
    }
    function ReadIncluded(): ReactNode {
      included.current = useCommands({ editing: true });
      return null;
    }
    function ReadExcluded(): ReactNode {
      excluded.current = useCommands({ editing: false });
      return null;
    }

    const tree = (withRegister: boolean): ReactNode => (
      <AdminProvider store={fakeStore}>
        {withRegister ? <Register /> : null}
        <ReadIncluded />
        <ReadExcluded />
      </AdminProvider>
    );

    const view = render(tree(true));
    expect(included.current.map((c) => c.id)).toEqual(["A"]);
    expect(excluded.current.map((c) => c.id)).toEqual([]);

    // Unmount the registering component → the command is unregistered.
    act(() => { view.rerender(tree(false)); });
    expect(included.current.map((c) => c.id)).toEqual([]);
  });
});

describe("DASH-T-0008 — duplicate-id guard (TC-002)", () => {
  it("throws when a second command registers the same id", () => {
    function Dup(): ReactNode {
      useRegisterCommand({ id: "x", title: "one", run: () => undefined });
      useRegisterCommand({ id: "x", title: "two", run: () => undefined });
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <AdminProvider store={fakeStore}>
          <Dup />
        </AdminProvider>,
      ),
    ).toThrow(/already registered/);
    spy.mockRestore();
  });
});

describe("DASH-T-0008 — reserved-kind guard (TC-003)", () => {
  it("throws 'not implemented this round' for a reserved kind", () => {
    function Reserved(): ReactNode {
      useRegisterExtension("navigation", {
        __reserved: "not implemented this round",
        id: "n1",
      });
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <AdminProvider store={fakeStore}>
          <Reserved />
        </AdminProvider>,
      ),
    ).toThrow(/reserved and not implemented this round/);
    spy.mockRestore();
  });
});

describe("DASH-T-0008 — per-kind narrow subscription (TC-004)", () => {
  it("registering a tool does not re-render a panels consumer", () => {
    let panelRenders = 0;
    function PanelsReader(): ReactNode {
      useExtensions("panels");
      panelRenders += 1;
      return null;
    }
    function ToolRegister(): ReactNode {
      useRegisterExtension("tools", { id: "t1", render: () => null });
      return null;
    }
    render(
      <AdminProvider store={fakeStore}>
        <PanelsReader />
        <ToolRegister />
      </AdminProvider>,
    );
    // The tool registered in an effect after the first commit; the panels
    // snapshot identity is unchanged, so the panels reader did not re-render for
    // it. One render for mount is expected; assert no EXTRA render was forced.
    expect(panelRenders).toBe(1);
  });
});

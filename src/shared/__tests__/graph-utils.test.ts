/**
 * Tests for validateGraph: cycles, orphaned refs, start node.
 */

import { describe, expect, it } from "vitest";
import type { CapabilityGraph } from "../graph-utils.js";
import { validateGraph } from "../graph-utils.js";

describe("validateGraph", () => {
  it("accepts valid DAG with one start node", () => {
    const dag: CapabilityGraph = {
      nodes: [
        { id: "a", type: "plan", service: "planner", input: {} },
        { id: "b", type: "run", service: "executor", input: { dependsOn: ["a"] } },
      ],
      edges: [{ from: "a", to: "b" }],
    };
    const r = validateGraph(dag);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("identifies cyclic graph", () => {
    const dag: CapabilityGraph = {
      nodes: [
        { id: "a", type: "x", service: "s", input: { dependsOn: ["c"] } },
        { id: "b", type: "x", service: "s", input: { dependsOn: ["a"] } },
        { id: "c", type: "x", service: "s", input: { dependsOn: ["b"] } },
      ],
      edges: [],
    };
    const r = validateGraph(dag);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("cycle"))).toBe(true);
  });

  it("identifies orphaned dependency reference", () => {
    const dag: CapabilityGraph = {
      nodes: [
        { id: "a", type: "x", service: "s", input: {} },
        { id: "b", type: "x", service: "s", input: { dependsOn: ["missing-node"] } },
      ],
      edges: [],
    };
    const r = validateGraph(dag);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("unknown node") && e.includes("missing-node"))).toBe(true);
  });

  it("identifies no start node (every node has dependencies)", () => {
    const dag: CapabilityGraph = {
      nodes: [
        { id: "a", type: "x", service: "s", input: { dependsOn: ["b"] } },
        { id: "b", type: "x", service: "s", input: { dependsOn: ["a"] } },
      ],
      edges: [],
    };
    const r = validateGraph(dag);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("cycle") || e.includes("start node"))).toBe(true);
  });

  it("accepts DAG with multiple start nodes", () => {
    const dag: CapabilityGraph = {
      nodes: [
        { id: "a", type: "x", service: "s", input: {} },
        { id: "b", type: "x", service: "s", input: {} },
        { id: "c", type: "x", service: "s", input: { dependsOn: ["a", "b"] } },
      ],
      edges: [],
    };
    const r = validateGraph(dag);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

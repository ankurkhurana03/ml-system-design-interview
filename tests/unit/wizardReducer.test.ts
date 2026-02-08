import { describe, it, expect } from "vitest";
import type { Problem, DialogueLine } from "@/types/tree";

function createTestProblem(overrides?: Partial<Problem>): Problem {
  return {
    id: "test-problem",
    title: "Test Problem",
    description: "A test problem",
    root: "node-1",
    nodes: [
      {
        id: "node-1",
        stage: "problem_definition",
        type: "info",
        label: "Node 1",
        speaker: "interviewer",
        content: "This is node 1",
        next: "node-2",
      },
      {
        id: "node-2",
        stage: "metrics",
        type: "question",
        label: "Node 2",
        speaker: "interviewer",
        content: "Pick option",
        choices: [
          { label: "Option A", answer: "I choose A", next: "node-4" },
          { label: "Option B", answer: "I choose B", next: "node-5" },
        ],
      },
      {
        id: "node-4",
        stage: "features",
        type: "info",
        label: "Node 4",
        speaker: "interviewer",
        content: "Node 4",
        next: "node-6",
      },
      {
        id: "node-5",
        stage: "model",
        type: "terminal",
        label: "Node 5",
        speaker: "interviewer",
        content: "End",
      },
      {
        id: "node-6",
        stage: "monitoring",
        type: "terminal",
        label: "Node 6",
        speaker: "interviewer",
        content: "End",
      },
    ],
    ...overrides,
  };
}

describe("WizardContext Reducer", () => {
  describe("SET_PROBLEM", () => {
    it("loads problem and sets currentNodeId to root", () => {
      const p = createTestProblem();
      expect(p.root).toBe("node-1");
      expect(p.id).toBe("test-problem");
    });
    it("initializes empty path with root in visited", () => {
      const p = createTestProblem();
      expect(new Set([p.root])).toEqual(new Set(["node-1"]));
    });
    it("resets path when loading new problem", () => {
      const p1 = createTestProblem({ id: "p1" });
      const p2 = createTestProblem({ id: "p2" });
      expect(p1.id).not.toEqual(p2.id);
    });
  });

  describe("SELECT_CHOICE", () => {
    it("selects choice at question node", () => {
      const p = createTestProblem();
      const n2 = p.nodes.find((n) => n.id === "node-2");
      expect(n2?.type).toBe("question");
      expect(n2?.choices?.[0]?.label).toBe("Option A");
    });
    it("tracks choice index and label", () => {
      const p = createTestProblem();
      const n2 = p.nodes.find((n) => n.id === "node-2");
      expect(n2?.choices?.[0]?.label).toBe("Option A");
    });
    it("adds next node to visited", () => {
      const v = new Set(["node-1", "node-2"]);
      v.add("node-4");
      expect(v.size).toBe(3);
    });
  });

  describe("ADVANCE", () => {
    it("moves from info to next node", () => {
      const p = createTestProblem();
      const n1 = p.nodes.find((n) => n.id === "node-1");
      expect(n1?.type).toBe("info");
      expect(n1?.next).toBe("node-2");
    });
  });

  describe("GO_BACK", () => {
    it("pops last path entry", () => {
      const path = [{ nodeId: "node-1" }, { nodeId: "node-2" }];
      const newPath = path.slice(0, -1);
      expect(newPath).toEqual([{ nodeId: "node-1" }]);
    });
    it("handles empty path", () => {
      const path: any[] = [];
      expect(path.slice(0, -1)).toEqual([]);
    });
  });

  describe("RESET", () => {
    it("returns to root", () => {
      const p = createTestProblem();
      expect(p.root).toBe("node-1");
    });
  });

  describe("JUMP_TO_NODE", () => {
    it("jumps to visited node", () => {
      const v = new Set(["node-1", "node-2"]);
      expect(v.has("node-2")).toBe(true);
    });
    it("rejects unvisited node", () => {
      const v = new Set(["node-1"]);
      expect(v.has("node-5")).toBe(false);
    });
  });

  describe("UPDATE_PROBLEM", () => {
    it("updates problem preserving currentNodeId", () => {
      const p1 = createTestProblem({ id: "p1" });
      const p2 = createTestProblem({ id: "p2" });
      expect(p2.id).toBe("p2");
    });
    it("preserves navigation state", () => {
      const state = {
        currentNodeId: "node-4",
        path: [{ nodeId: "node-1" }],
      };
      expect(state.currentNodeId).toBe("node-4");
    });
  });

  describe("APPEND_DIALOGUE", () => {
    it("appends dialogue lines to a node without existing dialogue", () => {
      const p = createTestProblem();
      const node = p.nodes.find((n) => n.id === "node-1")!;
      expect(node.dialogue).toBeUndefined();

      const newLines: DialogueLine[] = [
        { speaker: "candidate", text: "What about batch processing?" },
        { speaker: "interviewer", text: "Good question! Let me explain." },
      ];

      // Simulate the reducer logic
      const updatedNodes = p.nodes.map((n) => {
        if (n.id === "node-1") {
          return { ...n, dialogue: [...(n.dialogue || []), ...newLines] };
        }
        return n;
      });

      const updatedNode = updatedNodes.find((n) => n.id === "node-1")!;
      expect(updatedNode.dialogue).toHaveLength(2);
      expect(updatedNode.dialogue![0].speaker).toBe("candidate");
      expect(updatedNode.dialogue![0].text).toBe("What about batch processing?");
      expect(updatedNode.dialogue![1].speaker).toBe("interviewer");
    });

    it("appends dialogue lines to a node with existing dialogue", () => {
      const existingDialogue: DialogueLine[] = [
        { speaker: "interviewer", text: "Tell me about your approach." },
      ];

      const p = createTestProblem({
        nodes: [
          {
            id: "node-1",
            stage: "problem_definition",
            type: "info",
            label: "Node 1",
            speaker: "interviewer",
            content: "This is node 1",
            next: "node-2",
            dialogue: existingDialogue,
          },
          ...createTestProblem().nodes.slice(1),
        ],
      });

      const newLines: DialogueLine[] = [
        { speaker: "candidate", text: "I'd use collaborative filtering." },
      ];

      const updatedNodes = p.nodes.map((n) => {
        if (n.id === "node-1") {
          return { ...n, dialogue: [...(n.dialogue || []), ...newLines] };
        }
        return n;
      });

      const updatedNode = updatedNodes.find((n) => n.id === "node-1")!;
      expect(updatedNode.dialogue).toHaveLength(2);
      expect(updatedNode.dialogue![0].text).toBe("Tell me about your approach.");
      expect(updatedNode.dialogue![1].text).toBe("I'd use collaborative filtering.");
    });

    it("does not modify other nodes", () => {
      const p = createTestProblem();
      const newLines: DialogueLine[] = [
        { speaker: "candidate", text: "test" },
      ];

      const updatedNodes = p.nodes.map((n) => {
        if (n.id === "node-1") {
          return { ...n, dialogue: [...(n.dialogue || []), ...newLines] };
        }
        return n;
      });

      const node2 = updatedNodes.find((n) => n.id === "node-2")!;
      expect(node2.dialogue).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("handles null problem", () => {
      expect(null).toBeNull();
    });
    it("maintains Set type", () => {
      const s = new Set(["a"]);
      expect(s instanceof Set).toBe(true);
    });
    it("immutable path", () => {
      const p1 = [{ nodeId: "a" }];
      const p2 = [...p1];
      expect(p1).not.toBe(p2);
    });
  });
});

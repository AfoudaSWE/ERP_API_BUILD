import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Save,
  Play,
  CheckCircle2,
  Upload,
  Download,
  Undo2,
  Redo2,
  WandSparkles,
  Power,
  Settings,
  ArrowLeft,
  History,
  BookCheck,
} from "lucide-react";
import WorkflowNode from "../components/WorkflowNode";
import NodeLibrary from "../components/NodeLibrary";
import NodeConfigPanel from "../components/NodeConfigPanel";
import ExecutionPanel from "../components/ExecutionPanel";
import { createWorkflowNode, CATEGORY_STYLES } from "../domain/catalog";
import { validateWorkflow } from "../domain/graph";
import { MockWorkflowRuntime, createRetailEvent } from "../domain/runtime";
import { useWorkflowStore } from "../store/workflowStore";
import { useAppStore } from "../../../store/appStore";

const nodeTypes = { workflowNode: WorkflowNode };
const blank = () => ({
  id: `workflow_${crypto.randomUUID().slice(0, 8)}`,
  name: "Untitled workflow",
  description: "",
  status: "draft",
  version: 1,
  owner: "Retail Manager",
  tags: [],
  nodes: [],
  edges: [],
  updatedAt: new Date().toISOString(),
});
export default function WorkflowEditor() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const existing = useWorkflowStore((s) =>
    s.workflows.find((w) => w.id === workflowId),
  );
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const updateExecution = useWorkflowStore((s) => s.updateExecution);
  const storeId = useAppStore((s) => s.selectedStoreId);
  const addNotification = useAppStore((s) => s.addNotification);
  const [workflow, setWorkflow] = useState(() =>
    existing ? structuredClone(existing) : blank(),
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);

  // Let the guided tour open a real node so the configuration walkthrough can
  // demonstrate the fields instead of pointing at an empty side panel.
  useEffect(() => {
    const selectFirstNodeForTour = () => setSelectedId((current) => current ?? nodes[0]?.id ?? null);
    window.addEventListener("retailtwin:tour-select-node", selectFirstNodeForTour);
    return () => window.removeEventListener("retailtwin:tour-select-node", selectFirstNodeForTour);
  }, [nodes]);
  const [execution, setExecution] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const runtimeRef = useRef(null);
  const reactFlowRef = useRef(null);
  const fileRef = useRef(null);
  const clipboardRef = useRef(null);
  const selected = nodes.find((n) => n.id === selectedId);
  const current = useMemo(
    () => ({ ...workflow, nodes, edges }),
    [workflow, nodes, edges],
  );
  useEffect(() => {
    if (existing) {
      setWorkflow(structuredClone(existing));
      setNodes(existing.nodes);
      setEdges(existing.edges);
    }
  }, [existing, setNodes, setEdges]);
  useEffect(() => {
    const guard = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const snapshot = useCallback(() => {
    setHistory((h) => [
      ...h.slice(-29),
      { nodes: structuredClone(nodes), edges: structuredClone(edges) },
    ]);
    setFuture([]);
    setDirty(true);
  }, [nodes, edges]);
  const connect = useCallback(
    (params) => {
      snapshot();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      );
    },
    [setEdges, snapshot],
  );
  const drop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/retail-node");
      if (!type) return;
      const position = reactFlowRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) || { x: 100, y: 100 };
      snapshot();
      setNodes((list) => [...list, createWorkflowNode(type, position)]);
    },
    [setNodes, snapshot],
  );
  const save = () => {
    const next = { ...current, updatedAt: new Date().toISOString() };
    saveWorkflow(next);
    setWorkflow(next);
    setDirty(false);
    setMessage({ ok: true, text: "Draft saved locally." });
    if (!workflowId) navigate(`/agent-workflows/${next.id}`, { replace: true });
  };
  const validate = () => {
    const result = validateWorkflow(nodes, edges);
    setMessage({
      ok: result.valid,
      text: result.valid
        ? "Workflow is valid."
        : result.errors.map((e) => e.message).join(" "),
    });
    return result.valid;
  };
  const execute = async () => {
    if (!validate()) return;
    save();
    setPanelCollapsed(false);
    const runtime = new MockWorkflowRuntime({
      notificationPublisher: addNotification,
      onUpdate: (run) => {
        setExecution(run);
        updateExecution(run);
        setNodes((list) =>
          list.map((node) => {
            const state = run.nodeExecutions[node.id];
            return {
              ...node,
              data: {
                ...node.data,
                status: state?.status || "IDLE",
                durationMs: state?.durationMs,
              },
            };
          }),
        );
      },
    });
    runtimeRef.current = runtime;
    try {
      await runtime.execute(current, {
        storeId,
        user: "Retail Manager",
        event: createRetailEvent("QUEUE_THRESHOLD_EXCEEDED", storeId, {
          queueLength: 8,
          averageWaitMinutes: 6.4,
          openCounters: 2,
        }),
      });
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  };
  const updateNode = (node) => {
    snapshot();
    setNodes((list) => list.map((n) => (n.id === node.id ? node : n)));
    setDirty(true);
  };
  const deleteNode = (id) => {
    snapshot();
    setNodes((list) => list.filter((n) => n.id !== id));
    setEdges((list) => list.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((f) => [{ nodes, edges }, ...f]);
    setHistory((h) => h.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setDirty(true);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((h) => [...h, { nodes, edges }]);
    setFuture((f) => f.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setDirty(true);
  };
  const autoLayout = () => {
    snapshot();
    setNodes((list) =>
      list.map((n, i) => ({
        ...n,
        position: { x: 80 + (i % 4) * 260, y: 80 + Math.floor(i / 4) * 170 },
      })),
    );
    setDirty(true);
  };
  const applyTemplate = (template) => {
    snapshot();
    setNodes(structuredClone(template.nodes));
    setEdges(structuredClone(template.edges));
    setWorkflow((w) => ({
      ...w,
      name: template.name,
      description: template.description,
    }));
    setDirty(true);
  };
  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${workflow.name.replace(/\W+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importWorkflow = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      snapshot();
      setNodes(parsed.nodes || []);
      setEdges(parsed.edges || []);
      setWorkflow((w) => ({
        ...w,
        name: parsed.name || w.name,
        description: parsed.description || "",
      }));
      setDirty(true);
    } catch {
      setMessage({ ok: false, text: "Import failed: invalid workflow JSON." });
    }
  };
  const publish = () => {
    if (!validate()) return;
    const next = {
      ...current,
      status: "published",
      version: (workflow.version || 0) + 1,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveWorkflow(next);
    setWorkflow(next);
    setDirty(false);
    setMessage({
      ok: true,
      text: `Published immutable version ${next.version}.`,
    });
  };
  const copySelected = () => {
    const selectedNodes = nodes.filter(
      (n) => n.selected || n.id === selectedId,
    );
    const ids = new Set(selectedNodes.map((n) => n.id));
    if (selectedNodes.length)
      clipboardRef.current = {
        nodes: structuredClone(selectedNodes),
        edges: structuredClone(
          edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
        ),
      };
  };
  const pasteSelected = () => {
    const clip = clipboardRef.current;
    if (!clip) return;
    snapshot();
    const ids = new Map(
      clip.nodes.map((n) => [
        n.id,
        `${n.data.nodeType}_${crypto.randomUUID().slice(0, 8)}`,
      ]),
    );
    setNodes((list) => [
      ...list,
      ...clip.nodes.map((n) => ({
        ...n,
        id: ids.get(n.id),
        selected: true,
        position: { x: n.position.x + 32, y: n.position.y + 32 },
      })),
    ]);
    setEdges((list) => [
      ...list,
      ...clip.edges.map((e) => ({
        ...e,
        id: `edge_${crypto.randomUUID().slice(0, 8)}`,
        source: ids.get(e.source),
        target: ids.get(e.target),
      })),
    ]);
    setDirty(true);
  };
  useEffect(() => {
    const keys = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (mod && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (
        mod &&
        e.key.toLowerCase() === "c" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        copySelected();
      }
      if (
        mod &&
        e.key.toLowerCase() === "v" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        pasteSelected();
      }
      if (
        mod &&
        e.key.toLowerCase() === "d" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        copySelected();
        pasteSelected();
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
      ) {
        deleteNode(selectedId);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });
  return (
    <div className="-m-3 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden sm:-m-4 lg:-m-6">
      <header data-tour="workflow-toolbar" className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3">
        <button onClick={() => navigate("/agent-workflows")} className="p-2">
          <ArrowLeft size={16} />
        </button>
        <input
          value={workflow.name}
          onChange={(e) => {
            setWorkflow((w) => ({ ...w, name: e.target.value }));
            setDirty(true);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none sm:max-w-64"
        />
        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[9px] uppercase text-amber-500">
          {dirty ? "Unsaved" : `${workflow.status} v${workflow.version}`}
        </span>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <Tool
            icon={Undo2}
            label="Undo"
            onClick={undo}
            disabled={!history.length}
          />
          <Tool
            icon={Redo2}
            label="Redo"
            onClick={redo}
            disabled={!future.length}
          />
          <Tool icon={WandSparkles} label="Auto-layout" onClick={autoLayout} />
          <Tool
            icon={Upload}
            label="Import"
            onClick={() => fileRef.current?.click()}
          />
          <Tool icon={Download} label="Export" onClick={exportWorkflow} />
          <Tool
            icon={History}
            label="Versions"
            onClick={() =>
              setMessage({
                ok: true,
                text: `Current version: ${workflow.version}. Published graphs are copied before subsequent edits.`,
              })
            }
          />
          <Tool
            icon={Settings}
            label="Settings"
            onClick={() => navigate(`/agent-workflows/${workflow.id}/settings`)}
          />
        </div>
        <button
          onClick={validate}
          className="ui-button hidden px-3 py-2 text-xs sm:flex"
        >
          <CheckCircle2 size={13} />
          Validate
        </button>
        <button onClick={save} className="ui-button px-3 py-2 text-xs">
          <Save size={13} />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button
          onClick={publish}
          className="ui-button hidden px-3 py-2 text-xs lg:flex"
        >
          <BookCheck size={13} />
          Publish
        </button>
        <button
          onClick={() => {
            setWorkflow((w) => ({
              ...w,
              status: w.status === "active" ? "draft" : "active",
            }));
            setDirty(true);
          }}
          className="ui-button hidden px-3 py-2 text-xs xl:flex"
        >
          <Power size={13} />
          {workflow.status === "active" ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={execute}
          className="ui-button ui-button-primary px-3 py-2 text-xs"
        >
          <Play size={13} />
          Execute
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={importWorkflow}
        />
      </header>
      {message && (
        <div
          className={`absolute left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-xs shadow-lg ${message.ok ? "border-emerald-500/30 bg-emerald-950 text-emerald-200" : "border-red-500/30 bg-red-950 text-red-200"}`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-4">
            ×
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <NodeLibrary onTemplate={applyTemplate} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            data-tour="workflow-canvas"
            className="workflow-canvas relative min-h-0 flex-1"
            onDrop={drop}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
          >
            <ReactFlow
              onInit={(instance) => {
                reactFlowRef.current = instance;
              }}
              nodes={nodes}
              edges={edges}
              onNodesChange={(changes) => {
                onNodesChange(changes);
                if (changes.some((c) => c.type !== "select")) setDirty(true);
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes);
                setDirty(true);
              }}
              onConnect={connect}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              deleteKeyCode={["Backspace", "Delete"]}
              multiSelectionKeyCode="Shift"
              selectionOnDrag
            >
              <Background gap={16} color="var(--grid)" />
              <Controls />
              <MiniMap
                nodeColor={(node) =>
                  CATEGORY_STYLES[node.data.category]?.color || "#64748b"
                }
                pannable
                zoomable
              />
            </ReactFlow>
            {!nodes.length && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]/90 p-8 text-center">
                  <WorkflowNodeEmpty />
                  <p className="mt-3 text-sm font-semibold">
                    Build your first automation
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Drag a trigger here or choose a retail template.
                  </p>
                </div>
              </div>
            )}
          </div>
          <ExecutionPanel
            execution={execution}
            collapsed={panelCollapsed}
            onToggle={() => setPanelCollapsed((v) => !v)}
            onStop={() => runtimeRef.current?.cancel()}
            onDecision={(approved) =>
              runtimeRef.current?.resolveApproval(
                approved,
                approved
                  ? "Approved in workflow editor"
                  : "Rejected in workflow editor",
              )
            }
          />
        </div>
        <NodeConfigPanel
          node={selected}
          onChange={updateNode}
          onClose={() => setSelectedId(null)}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
}
function Tool({ icon: Icon, label, ...props }) {
  return (
    <button
      {...props}
      className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
function WorkflowNodeEmpty() {
  return <WandSparkles className="mx-auto text-orange-500" size={26} />;
}

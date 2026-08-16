# Agent Workflows user guide

Agent Workflows is RetailTwin's visual automation builder. A workflow starts with one trigger, passes retail data through connected nodes, can ask a local LLM to analyze the situation, and finishes with an action, report, or notification.

Open the feature at `/agent-workflows`.

## Quick start

1. Open **Agent Workflows** from the main navigation.
2. Choose a retail template, or select **Create workflow** for an empty canvas.
3. Drag nodes from the library on the left onto the canvas.
4. Connect the right handle of one node to the left handle of the next node.
5. Click a node to open its configuration and usage information on the right.
6. Select **Validate** to check the graph.
7. Select **Save**, then **Execute** to test it.
8. Expand **Execution log** to inspect each node's result.
9. When the workflow is ready, select **Publish** and **Activate**.

The **?** button in the top bar starts the guided tour for the current page.

## Workflow structure

A useful workflow normally follows this pattern:

```text
Trigger -> Read business data -> LLM agent or decision -> Approval -> Action -> Notification
```

Example:

```text
Queue threshold exceeded
  -> Get queue metrics
  -> Queue Optimization Agent
  -> Recommend opening checkout
  -> Human Approval
  -> Create operations task
  -> Dashboard notification
```

A workflow must have at least one node and exactly one trigger. Normal cycles are rejected; intentional repetition requires an explicit **Loop** node.

## Understanding the node library

Nodes are grouped by their role in the workflow:

| Category | Purpose | Typical placement |
| --- | --- | --- |
| Triggers | Start an execution from a user, time, webhook, device, or retail event | First node |
| AI & Agents | Use the configured local Ollama LLM to analyze upstream information | After data-reading nodes |
| Ollama Model | Represents local model-provider configuration | Beside or before an AI agent |
| MCP | Access an allow-listed MCP server, tool, resource, or prompt | After inputs have been prepared |
| Retail Business | Read store KPIs or prepare retail actions | Between a trigger and a decision |
| Inventory | Read stock, calculate risk, or prepare replenishment actions | In inventory workflows |
| Store Operations | Read operational state or prepare tasks and maintenance actions | In operational workflows |
| Flow Control | Branch, filter, merge, wait, retry, loop, or stop execution | Between business steps |
| Human Approval | Pause a sensitive action until an authorized person decides | Immediately before a controlled action |
| Data Transformation | Prepare safe structured values for downstream nodes | Before the node that consumes the data |
| Output & Communication | Deliver notifications, reports, exports, or audit records | Near the end of a path |

Hover over any node—or focus it with the keyboard—to open its detailed tooltip. The tooltip explains:

- Its business purpose.
- How and where to use it.
- Expected input and output.
- Default timeout, retries, error behavior, and type-specific settings.
- Whether the node requires approval.

## Trigger differences

| Trigger | Starts when | Example |
| --- | --- | --- |
| Manual Trigger | A user selects **Execute** | Ad-hoc analysis or testing |
| Schedule Trigger | Its configured cron schedule is due | Daily manager brief |
| Webhook Trigger | A verified external request arrives | Integration event |
| Retail Event Trigger | A selected RetailTwin event occurs | Conversion rate drops |
| Inventory Event Trigger | Stock state changes | Low stock detected |
| Queue Event Trigger | Queue conditions change | Wait threshold exceeded |
| Digital Twin Event Trigger | A Digital Twin event occurs | Occupancy threshold exceeded |
| POS Event Trigger | A POS transaction or health event occurs | POS terminal offline |
| Alert Trigger | A new alert is created | Critical incident triage |
| Device Event Trigger | Device health changes | Camera or sensor offline |

Only one trigger is allowed in a workflow. Manual execution is available in the editor for testing, even when a workflow has an event-based trigger.

In this browser-based MVP, schedule, webhook, and event subscriptions are represented in workflow configuration and templates. Continuous production triggering requires a server-side scheduler and event gateway.

## Adding and connecting nodes

To add a node:

1. Find it using **Search nodes**.
2. Read its tooltip to confirm that it matches the intended job.
3. Drag it onto the canvas.
4. Drag from the source handle on its right side to the target handle on the next node's left side.

Canvas controls:

- Click a node to select it.
- Drag a node to reposition it.
- Click the background to clear the selection.
- Use the canvas controls to zoom and fit the graph.
- Use **Auto-layout** to organize the graph.
- Press `Delete` or `Backspace` to remove selected nodes.
- Use `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, and `Ctrl/Cmd+D` to copy, paste, or duplicate selections.
- Use `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` for undo and redo.

## Viewing and editing selected-node details

Click any canvas node. The right-side **Node configuration** panel then shows:

- The selected node's label and business purpose.
- Type-specific configuration.
- Timeout and retry behavior.
- What happens when the node fails.
- Expected input and output.
- Safe-expression guidance.
- **Test node** and **Delete node** controls.

For an LLM agent, the panel also includes:

- Agent role.
- System instruction.
- Maximum reasoning steps.
- Temperature.
- Ollama model name.

The blue **LLM-powered node** notice confirms that the node sends scoped upstream workflow context to Ollama during execution. The node footer also displays `LLM · model-name`.

## How LLM agents work

Every node in the **AI & Agents** category invokes the local Ollama provider. Built-in agents include:

- AI Agent.
- Retail Analyst Agent.
- Inventory Agent.
- Store Operations Agent.
- Queue Optimization Agent.
- Sales Analyst Agent.
- Summarizer.
- Classifier.

Agents receive the workflow identity, trigger payload, selected store, previous node outputs, and the node's system instruction. They return a recommendation, reasoning, actions, confidence, raw response, model name, and duration where available.

They do not silently use a cloud model. If Ollama or the selected model is unavailable, the node fails and the execution log shows the error.

### Ollama setup

The default model is `qwen2.5-coder:7b`:

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

Use `/agent-connections` to test the local Ollama connection. A different locally installed model can be entered in the selected agent's **Ollama model** field.

### MCP connection test

The **Agent Connections** page supports MCP servers using Streamable HTTP. To run the bundled no-dependency test server from the workspace root:

```bash
npm run mcp:test-server
```

Then open `/agent-connections`, choose **Add MCP server**, keep the default endpoint `http://127.0.0.1:7331/mcp`, and select **Add and test**. A successful discovery shows the `echo` and `store_status` tools. The test server binds only to localhost and permits the local Vite origins on ports 4200 and 5173.

The browser client performs the MCP initialization lifecycle and `tools/list` request. Remote endpoints must use HTTP or HTTPS and allow the application origin through CORS. Authenticated production MCP servers still require a backend gateway so credentials are not stored in browser state.

## Passing data between nodes

Upstream node outputs can be referenced with safe property-path expressions:

```text
{{ nodes.nodeId.output.field }}
```

Example:

```text
{{ nodes.getQueue.output.averageWaitMinutes }}
```

Expressions only support safe property paths. They do not execute JavaScript, function calls, or arbitrary operators. Use transformation and flow-control nodes for calculations, filtering, and branching.

## Validation, saving, and activation

- **Validate** checks for an empty graph, missing or multiple triggers, invalid edges, unsupported cycles, missing labels, and required trigger configuration.
- **Save** keeps the current draft in browser local storage.
- **Publish** creates a version intended for controlled release.
- **Activate** marks the workflow as ready for its configured trigger.
- **Execute** starts an immediate test run.
- **Import** and **Export** move workflow JSON between environments.
- **Settings** opens execution limits, retry policy, retention, security, approval, and audit options.

An **Unsaved** badge appears after the graph or configuration changes.

## Approvals and controlled actions

Place **Human Approval** immediately before actions that change operational state, such as:

- Creating a purchase request.
- Creating an operations or maintenance task.
- Updating alert status.
- Sending a Digital Twin command.
- Sending through an external communication adapter.

When execution reaches an approval node, it pauses with `WAITING_FOR_APPROVAL`. The lower execution panel shows the requested action, expected impact, risk level, and decision controls. The LLM cannot approve its own requested action.

## Running and troubleshooting workflows

Select **Execute**, then expand **Execution log**. It shows:

- The current execution status.
- Every node's start and completion event.
- Node duration.
- LLM model calls and results.
- Tool output.
- Approval requests.
- Errors and cancellation.

Use the workflow card's history button to open completed execution traces.

Common problems:

| Problem | Resolution |
| --- | --- |
| Workflow requires a trigger | Add exactly one trigger node |
| Retail event type is required | Select an event in the trigger configuration |
| Model is unavailable | Run `ollama pull <model-name>` and test Agent Connections |
| Ollama is unavailable | Start it with `ollama serve` |
| Node receives no useful context | Connect the required data node before it |
| Sensitive action runs without governance | Add Human Approval immediately before it |
| Unknown variable in expression | Check the upstream node ID and output property path |
| Workflow stops after a failure | Change **On error** only when continuing is safe, or add an error path |

## Choosing a template

The template library includes 15 starter workflows across checkout, inventory, management, sales, operations, devices, risk, customer experience, and products.

Each template card explains:

- Expected business outcome.
- Intended users.
- Trigger type.
- Complexity.
- Required setup before activation.
- Whether human approval is included.

Templates are starting points. After selecting one, inspect every node, confirm the selected store scope, adjust thresholds and roles, test the LLM instructions, validate the graph, and run it before activation.

## Demo and production boundaries

The current application is a browser demonstration:

- Workflows and executions are stored in local storage.
- Retail tools use mock application services.
- Ollama runs locally.
- Several production triggers and integrations require a backend gateway.
- Production secrets must never be stored in workflow JSON or sent to the model.

A production deployment should enforce authentication, organization and store scope, server-side permissions, encrypted connections, immutable versions, idempotency, concurrency limits, approval ownership, audit retention, and server-side execution.

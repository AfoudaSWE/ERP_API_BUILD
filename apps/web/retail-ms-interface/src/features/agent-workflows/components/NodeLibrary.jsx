import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Star, LayoutTemplate, Info } from 'lucide-react';
import { NODE_CATALOG, CATEGORY_STYLES, getNodeGuide } from '../domain/catalog';
import { WORKFLOW_TEMPLATES } from '../domain/templates';

const TOOLTIP_WIDTH = 336;

function tooltipPosition(element) {
  const rect = element.getBoundingClientRect();
  const fitsRight = rect.right + TOOLTIP_WIDTH + 16 <= window.innerWidth;
  return {
    left: fitsRight ? rect.right + 8 : Math.max(8, rect.left - TOOLTIP_WIDTH - 8),
    top: Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - 420)),
  };
}

function NodeTooltip({ tooltip }) {
  if (!tooltip) return null;
  const { node, left, top } = tooltip;
  const guide = getNodeGuide(node);
  const category = CATEGORY_STYLES[node.category];
  return createPortal(
    <div
      id="workflow-node-tooltip"
      role="tooltip"
      className="pointer-events-none fixed z-[10000] w-[336px] rounded-xl border border-[var(--border)] bg-[var(--popover)] p-4 text-left shadow-2xl"
      style={{ left, top }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: category?.bg, color: category?.color }}>
          <node.icon size={15} />
        </span>
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">{node.label}</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: category?.color }}>{category?.label}</p>
        </div>
      </div>
      <GuideRow label="Purpose" value={guide.purpose} />
      <GuideRow label="How to use" value={guide.howToUse} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <GuideBox label="Input" value={guide.input} />
        <GuideBox label="Output" value={guide.output} />
      </div>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Default configuration</p>
        <p className="mt-1 text-[10px] leading-5 text-[var(--foreground)]">{guide.defaults.join(' · ')}</p>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[9px] text-orange-500"><Info size={10} /> Drag onto the canvas, connect it, then click it for editable settings.</p>
    </div>,
    document.body,
  );
}

function GuideRow({ label, value }) {
  return <div className="mt-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p><p className="mt-1 text-[10px] leading-4 text-[var(--foreground)]">{value}</p></div>;
}

function GuideBox({ label, value }) {
  return <div className="rounded-lg bg-[var(--muted)] p-2.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p><p className="mt-1 text-[9px] leading-4 text-[var(--foreground)]">{value}</p></div>;
}

export default function NodeLibrary({ onTemplate }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('nodes');
  const [tooltip, setTooltip] = useState(null);
  const groups = useMemo(() => Object.entries(
    NODE_CATALOG
      .filter(node => `${node.label} ${node.description}`.toLowerCase().includes(search.toLowerCase()))
      .reduce((all, node) => { (all[node.category] ??= []).push(node); return all; }, {}),
  ), [search]);

  const drag = (event, node) => {
    setTooltip(null);
    event.dataTransfer.setData('application/retail-node', node.type);
    event.dataTransfer.effectAllowed = 'move';
  };
  const showTooltip = (event, node) => setTooltip({ node, ...tooltipPosition(event.currentTarget) });

  return (
    <aside data-tour="node-library" className="flex h-full w-[250px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] p-3">
        <div className="flex rounded-lg bg-[var(--muted)] p-1">
          <button onClick={() => setTab('nodes')} className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${tab === 'nodes' ? 'bg-[var(--card)] shadow-sm' : ''}`}>Nodes</button>
          <button onClick={() => setTab('templates')} className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${tab === 'templates' ? 'bg-[var(--card)] shadow-sm' : ''}`}>Templates</button>
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2"><Search size={13} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search nodes..." className="w-full bg-transparent text-xs outline-none" /></label>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {tab === 'nodes' ? groups.map(([category, nodes]) => (
          <section key={category} className="mb-3">
            <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{CATEGORY_STYLES[category]?.label}</h3>
            {nodes.map(node => {
              const Icon = node.icon;
              return (
                <div
                  key={node.type}
                  draggable
                  tabIndex={0}
                  aria-describedby="workflow-node-tooltip"
                  onDragStart={event => drag(event, node)}
                  onMouseEnter={event => showTooltip(event, node)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={event => showTooltip(event, node)}
                  onBlur={() => setTooltip(null)}
                  className="workflow-draggable group mb-1 flex items-center gap-2 rounded-lg border border-transparent p-2 outline-none hover:border-[var(--border)] hover:bg-[var(--muted)] focus:border-orange-500/40 focus:bg-[var(--muted)]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md" style={{ background: CATEGORY_STYLES[node.category]?.bg, color: CATEGORY_STYLES[node.category]?.color }}><Icon size={14} /></span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{node.label}</span>
                  <Info size={11} className="text-[var(--muted-foreground)] opacity-50 group-hover:text-orange-500 group-hover:opacity-100" />
                  <Star size={11} className="opacity-0 group-hover:opacity-50" />
                </div>
              );
            })}
          </section>
        )) : WORKFLOW_TEMPLATES
          .filter(template => `${template.name} ${template.description} ${template.category} ${template.outcome}`.toLowerCase().includes(search.toLowerCase()))
          .map(template => (
            <button key={template.id} onClick={() => onTemplate(template)} className="mb-2 w-full rounded-lg border border-[var(--border)] p-3 text-left hover:border-orange-500/40 hover:bg-orange-500/5">
              <div className="mb-2 flex items-center justify-between"><LayoutTemplate size={15} className="text-orange-500" /><span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[8px] text-[var(--muted-foreground)]">{template.category}</span></div>
              <p className="text-xs font-semibold">{template.name}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted-foreground)]">{template.description}</p>
              <p className="mt-2 text-[9px] leading-4 text-[var(--foreground)]"><span className="text-[var(--muted-foreground)]">Outcome:</span> {template.outcome}</p>
              <p className="mt-2 text-[9px] text-orange-500">{template.nodes.length} nodes · {template.complexity}{template.requiresApproval ? ' · Approval' : ''}</p>
            </button>
          ))}
      </div>
      <NodeTooltip tooltip={tooltip} />
    </aside>
  );
}

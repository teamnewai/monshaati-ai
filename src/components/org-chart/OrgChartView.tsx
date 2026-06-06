'use client';
import type { OrgChartNode, OrgChartNodeWithChildren } from '@/types/database';

function buildTree(nodes: OrgChartNode[]): OrgChartNodeWithChildren[] {
  const map: Record<string, OrgChartNodeWithChildren> = {};
  nodes.forEach(n => { map[n.id] = { ...n, children: [] }; });
  const roots: OrgChartNodeWithChildren[] = [];
  nodes.forEach(n => {
    if (n.parent_id && map[n.parent_id]) {
      map[n.parent_id].children.push(map[n.id]);
    } else if (!n.parent_id) {
      roots.push(map[n.id]);
    }
  });
  return roots;
}

const LEVEL_COLORS = [
  'from-slate-800 to-slate-900 border-slate-600/30',
  'from-brand-600 to-brand-700 border-brand-500/30',
  'from-blue-600 to-blue-700 border-blue-500/30',
  'from-purple-600 to-purple-700 border-purple-500/30',
  'from-emerald-600 to-emerald-700 border-emerald-500/30',
  'from-orange-500 to-orange-600 border-orange-400/30',
];

function NodeCard({ node }: { node: OrgChartNodeWithChildren; key?: string }) {
  const colorClass = LEVEL_COLORS[node.level % LEVEL_COLORS.length];

  return (
    <div className="flex flex-col items-center">
      <div className={`bg-gradient-to-br ${colorClass} text-white border rounded-xl px-4 py-3 min-w-[150px] max-w-[200px] text-center shadow-lg relative`}>
        {node.is_key_role && (
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">★</div>
        )}
        <div className="text-sm font-bold leading-tight">{node.title_ar}</div>
        {node.title_en && (
          <div className="text-[11px] opacity-70 mt-0.5">{node.title_en}</div>
        )}
        {node.department_ar && (
          <div className="text-[10px] opacity-60 mt-1 border-t border-white/20 pt-1">{node.department_ar}</div>
        )}
        {node.head_count > 1 && (
          <span className="mt-1 inline-block text-[10px] bg-white/20 rounded-full px-2 py-0.5">
            {node.head_count} ×
          </span>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-5 bg-gray-300" />
          <div className="relative flex gap-4 md:gap-6">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-4 right-4 h-0.5 bg-gray-300" />
            )}
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-5 bg-gray-300" />
                <NodeCard node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartView({ nodes }: { nodes: OrgChartNode[] }) {
  const tree = buildTree(nodes);
  if (!tree.length) {
    return <div className="text-center text-gray-400 py-12">لا يوجد هيكل تنظيمي</div>;
  }
  return (
    <div className="overflow-x-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-[300px]">
      <div className="flex justify-center min-w-max gap-8">
        {tree.map(root => <NodeCard key={root.id} node={root} />)}
      </div>
    </div>
  );
}

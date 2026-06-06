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

function Node({ node, depth = 0 }: { node: OrgChartNodeWithChildren; depth?: number; key?: string }) {
  return (
    <div style={{ marginRight: depth * 32, borderRight: depth > 0 ? '2px solid #e5e7eb' : 'none', paddingRight: 16, marginBottom: 8 }}>
      <div style={{ background: '#1a1a2e', color: 'white', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginBottom: 4 }}>
        <strong>{node.title_ar}</strong>
        {node.department_ar && (
          <span style={{ opacity: 0.7, fontSize: 12, marginRight: 8 }}>({node.department_ar})</span>
        )}
      </div>
      {node.children.map(c => <Node key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export default function PrintableOrgChart({ nodes }: { nodes: OrgChartNode[] }) {
  const tree = buildTree(nodes);
  return <div>{tree.map(r => <Node key={r.id} node={r} />)}</div>;
}

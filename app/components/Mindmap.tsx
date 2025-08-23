"use client"; // React Flow is a client-side library

import React from "react";
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  Position,
} from "reactflow";
import dagre from "dagre";

// Import the CSS
import "reactflow/dist/style.css";

// The hierarchical data structure for the mind map
const defaultData = [{ id: "root", topic: "Mindmap Kosong" }];

const nodeWidth = 172;
const nodeHeight = 36;

// Function to generate the layout using Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB" }); // 'TB' for top-to-bottom layout

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};

type MindmapItem = {
  id: string;
  topic: string;
  parentid?: string;
};

export default function Mindmap({ data = [] }: { data?: MindmapItem[] }) {
  // 1. Transform data into React Flow format
  if (data.length === 0) {
    data = defaultData;
  }
  const initialNodes: Node[] = data.map((item) => ({
    id: item.id,
    data: { label: item.topic },
    position: { x: 0, y: 0 }, // Dagre will calculate the final position
  }));

  const initialEdges: Edge[] = data
    .filter((item) => typeof item.parentid === "string")
    .map((item) => ({
      id: `e-${item.parentid}-${item.id}`,
      source: item.parentid as string,
      target: item.id,
    }));

  // 2. Calculate the layout. This is done only once.
  const { nodes, edges } = getLayoutedElements(initialNodes, initialEdges);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        fitView
      >
        <Controls showInteractive={true} />
        <Background />
      </ReactFlow>
    </div>
  );
}

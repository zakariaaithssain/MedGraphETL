"use client";

import SpriteText from 'three-spritetext';
import ForceGraph3D from 'react-force-graph-3d';
import { useState, useEffect } from 'react';

interface Node {
  id: number;
  name: string;
  label: string;
}

interface Link {
  source: number;
  target: number;
  type: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Home() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    "#8BD3E6",
    "#FF6D6A",
    "#E9EC6B",
    "#EFBE7D",
    "#B1A2CA"
  ];

  useEffect(() => {
    const requestData = {
      "nodes": ["CANCER"],
      "relationships": ["BINDS"],
      "limit": 1000,
      "export_format": "d3"
    };

    const fetchData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/relationships`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

        const newData = await response.json();

        if (newData.nodes && newData.nodes.length > 0) {
          setData(newData);
          setLoading(false);
          setError(null);
        } else {
          setError('No data returned from Neo4j. Make sure your database has data.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Fetching data failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading && data.nodes.length === 0) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading graph data...</div>;
  }

  if (error && data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-red-600">
        <div className="text-center">
          <p>Error loading data: {error}</p>
          <p className="text-sm mt-2">Make sure the backend API is running at {BACKEND_URL}</p>
        </div>
      </div>
    );
  }

  return (
    <ForceGraph3D
      graphData={data}
      nodeLabel={(node: Node) => node.name || String(node.id)}
      nodeAutoColorBy="label"
      linkColor={() => "#ab21fe"}
      linkWidth={1}
      linkOpacity={0.5}
      enableNodeDrag={false}
      nodeThreeObject={(node: Node) => {
        const sprite = new SpriteText(node.name || String(node.id));
        sprite.color = "black";
        sprite.padding = 4;
        // Map the color deterministically to a color in the colors array
        sprite.backgroundColor = colors[Number(String(node.name || node.id).split('').map(char => char.charCodeAt(0)).join('')) % colors.length];
        sprite.borderRadius = 10;
        sprite.textHeight = 8;
        return sprite;
      }}
    />
  );
}
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
}

export const Speedometer: React.FC<SpeedometerProps> = ({ speed, maxSpeed }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 200;
    const height = 100;
    const radius = Math.min(width, height) - 10;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height - 10})`);

    // Scale for the arc
    const scale = d3.scaleLinear()
      .domain([0, maxSpeed])
      .range([-Math.PI / 2, Math.PI / 2]);

    // Background Arc
    const arcBg = d3.arc()
      .innerRadius(radius - 20)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append("path")
      .attr("d", arcBg as any)
      .attr("fill", "#334155");

    // Active Arc
    const arcActive = d3.arc()
      .innerRadius(radius - 20)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(scale(speed));

    // Color based on speed
    let color = "#22d3ee"; // cyan
    if (speed > maxSpeed * 0.6) color = "#fbbf24"; // amber
    if (speed > maxSpeed * 0.85) color = "#ef4444"; // red

    g.append("path")
      .attr("d", arcActive as any)
      .attr("fill", color)
      .style("filter", `drop-shadow(0 0 8px ${color})`);

    // Text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -10)
      .attr("class", "font-display")
      .style("fill", "white")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .text(Math.floor(speed));
    
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 15)
      .style("fill", "#94a3b8")
      .style("font-size", "12px")
      .text("公里/小时"); // Changed KM/H to Chinese

  }, [speed, maxSpeed]);

  return (
    <div className="fixed bottom-4 right-4 pointer-events-none select-none z-50">
      <svg ref={svgRef} width={200} height={110} />
    </div>
  );
};
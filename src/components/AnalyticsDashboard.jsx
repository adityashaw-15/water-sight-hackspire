import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Chart } from 'react-chartjs-2';
import * as d3 from 'd3';
import { hexbin } from 'd3-hexbin';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const heatmapRef = useRef(null);
  const hexmapRef = useRef(null);

  // 1. Chart.js Bar Chart Data
  const barData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [
      {
        label: 'Rainfall (mm)',
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  // 2. Chart.js Line Graph Data
  const lineData = {
    labels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    datasets: [
      {
        label: 'Vegetation Cover (%)',
        data: [12, 19, 25, 27, 32, 35, 41],
        borderColor: 'rgb(22, 138, 76)',
        backgroundColor: 'rgba(22, 138, 76, 0.5)',
      },
    ],
  };

  // 3. Chart.js Mixed Chart Data
  const mixedData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        type: 'line',
        label: 'Evapotranspiration',
        borderColor: 'rgb(217, 67, 67)',
        borderWidth: 2,
        fill: false,
        data: [50, 45, 60, 70, 80, 90],
      },
      {
        type: 'bar',
        label: 'Surface Water Area (sq km)',
        backgroundColor: 'rgba(53, 162, 235, 0.8)',
        data: [20, 30, 40, 35, 25, 15],
      },
    ],
  };

  // 4. D3.js Heatmap (Dummy data)
  useEffect(() => {
    if (!heatmapRef.current) return;
    d3.select(heatmapRef.current).selectAll("*").remove();

    const margin = {top: 20, right: 20, bottom: 20, left: 40},
      width = 400 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

    const svg = d3.select(heatmapRef.current)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const myGroups = ["A", "B", "C", "D", "E"]
    const myVars = ["v1", "v2", "v3", "v4"]
    const data = [];
    for(let g of myGroups) {
      for(let v of myVars) {
        data.push({group: g, variable: v, value: Math.floor(Math.random() * 100)});
      }
    }

    const x = d3.scaleBand().range([ 0, width ]).domain(myGroups).padding(0.01);
    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));

    const y = d3.scaleBand().range([ height, 0 ]).domain(myVars).padding(0.01);
    svg.append("g").call(d3.axisLeft(y));

    const myColor = d3.scaleLinear().range(["#eaf8ef", "#168a4c"]).domain([1,100]);

    svg.selectAll()
      .data(data, d => d.group+':'+d.variable)
      .join("rect")
      .attr("x", d => x(d.group))
      .attr("y", d => y(d.variable))
      .attr("width", x.bandwidth() )
      .attr("height", y.bandwidth() )
      .style("fill", d => myColor(d.value));
  }, []);

  // 5. D3.js Hexagon Map (Check dams)
  useEffect(() => {
    if (!hexmapRef.current) return;
    d3.select(hexmapRef.current).selectAll("*").remove();

    const margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = 400 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

    const svg = d3.select(hexmapRef.current)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Dummy coordinate data for check dams
    const data = Array.from({length: 200}, () => [Math.random() * width, Math.random() * height]);

    const color = d3.scaleLinear()
      .domain([0, 15]) 
      .range(["#f0f0f0", "#d94343"]);

    const hexbinGen = hexbin()
      .radius(15)
      .extent([[0, 0], [width, height]]);

    const bins = hexbinGen(data);

    svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .selectAll("path")
      .data(bins)
      .join("path")
        .attr("d", hexbinGen.hexagon())
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("fill", d => color(d.length));

  }, []);

  return (
    <section className="content-width data-section" id="analytics" style={{ marginTop: '40px' }}>
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span /> ANALYTICS DASHBOARD</div>
          <h2>Interactive Visualizations</h2>
          <p>Comprehensive charts mapping various watershed metrics using Chart.js and D3.js</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Monthly Rainfall (Bar Chart)</h3>
          <Bar data={barData} />
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Vegetation Over Time (Line Graph)</h3>
          <Line data={lineData} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Water vs Evapotranspiration (Mixed Chart)</h3>
          <Chart type='bar' data={mixedData} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Regional Density (D3 Heatmap)</h3>
          <div ref={heatmapRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }}></div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #d8e8df' }}>
          <h3 style={{ marginBottom: '15px', color: '#102c3b', fontSize: '16px' }}>Check Dams Distribution (D3 Hexagon Map)</h3>
          <div ref={hexmapRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }}></div>
        </div>
      </div>
    </section>
  );
}

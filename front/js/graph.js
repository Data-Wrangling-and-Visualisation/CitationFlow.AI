import { getNodes } from './api.js';
import { GRADIENT } from './config.js';

export class GraphVisualizer {
    constructor() {
        this.config();
        this.init();
    }

    config() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.activeFilters = new Set();
    }

    init() {
        this.createTooltip();
        this.initSVG();
        this.loadAndVisualizeData();
    }

    async loadAndVisualizeData() {
        try {
            const rawNodes = await getNodes();

            const allTerms = new Set();
            rawNodes.forEach(node => {
                if (Array.isArray(node.topics)) {
                    node.topics.forEach(term => allTerms.add(term));
                }
            });

            const uniqueTerms = Array.from(allTerms);

            const colorScale = d3.scaleLinear()
                .domain(d3.range(0, 1 + 1e-9, 1 / (GRADIENT.length - 1)))
                .range(GRADIENT)
                .interpolate(d3.interpolateRgb);

            const colorMap = new Map();
            uniqueTerms.forEach((term, index) => {
                const t = index / (uniqueTerms.length - 1 || 1);
                colorMap.set(term, colorScale(t));
            });

            this.termColors = Object.fromEntries(colorMap);
            console.log(this.termColors);
            const graphData = this.prepareGraphData(rawNodes);
            this.initializeSimulation(graphData);
            this.createLegend();
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    prepareGraphData(nodes) {
        const visited = new Set();
        const clusters = [];

        // Preprocess refs for fast lookup
        const nodeRefsMap = new Map();
        nodes.forEach(node => {
            nodeRefsMap.set(node.doi, new Set(node.refs || []));
        });

        // First pass: identify all clusters based on references
        for (const node of nodes) {
            if (visited.has(node.doi)) continue;

            const cluster = new Set([node.doi]);
            const queue = [node.doi];
            visited.add(node.doi);

            // BFS to find connected components (based on references)
            while (queue.length > 0) {
                const currentDOI = queue.shift();

                // Find all nodes that reference or are referenced by current node
                for (const otherNode of nodes) {
                    if (visited.has(otherNode.doi)) continue;

                    // Check if nodes are connected in either direction using preprocessed refs
                    if (nodeRefsMap.get(otherNode.doi).has(currentDOI) ||
                        nodeRefsMap.get(currentDOI).has(otherNode.doi)) {
                        cluster.add(otherNode.doi);
                        visited.add(otherNode.doi);
                        queue.push(otherNode.doi);
                    }
                }
            }

            // Convert the cluster set to an array and chunk it (limit cluster size to 10)
            const fullCluster = Array.from(cluster);
            for (let i = 0; i < fullCluster.length; i += 10) {
                const chunk = fullCluster.slice(i, i + 10);
                clusters.push(chunk.map(doi => nodes.find(n => n.doi === doi)));
            }
        }

        // Position clusters in grid (dynamically adjust based on the number of clusters)
        const gridSize = Math.ceil(18);
        const cellWidth = Math.max(1, 50000 / gridSize);
        const cellHeight = Math.max(1, 50000 / gridSize);

        const processedNodes = [];
        const allLinks = [];
        const nodeMap = new Map();

        // Filter out clusters with only one node
        const filteredClusters = clusters.filter(cluster => cluster.length > 1);

        filteredClusters.forEach((cluster, clusterIndex) => {
            const row = Math.floor(clusterIndex / gridSize);
            const col = clusterIndex % gridSize;
            const centerX = col * cellWidth + cellWidth / 2 - 25000;
            const centerY = row * cellHeight + cellHeight / 2 - 25000;

            cluster.forEach((node) => {
                const nodeObj = {
                    ...node,
                    color: this.termColors[node.topics?.[0]] || "#ccc", // Default color if undefined
                    x: centerX,
                    y: centerY,
                    cluster: clusterIndex
                };

                processedNodes.push(nodeObj);
                nodeMap.set(node.doi, nodeObj);
            });
        });

        // Process links based on references and ensure they're within the same cluster
        nodes.forEach(source => {
            const sourceCluster = nodeMap.get(source.doi)?.cluster;

            (source.refs || []).forEach(targetDOI => {
                const targetNode = nodeMap.get(targetDOI);

                // Only create a link if the source and target belong to the same cluster
                if (targetNode) {
                    const targetCluster = targetNode.cluster;
                    if (sourceCluster === targetCluster) {
                        // Create link if they are in the same cluster and referencing each other
                        allLinks.push({
                            source: source.doi,
                            target: targetDOI
                        });
                    }
                }
            });
        });

        // Ensure we also create intra-cluster links by checking references between nodes
        filteredClusters.forEach(cluster => {
            // Create links between nodes that reference each other within the same cluster
            cluster.forEach((node) => {
                const sourceDOI = node.doi;
                const nodeRefs = nodeRefsMap.get(sourceDOI) || [];
                nodeRefs.forEach(refDOI => {
                    // Check if the reference node is in the same cluster
                    const targetNode = nodeMap.get(refDOI);
                    if (targetNode && targetNode.cluster === node.cluster) {
                        allLinks.push({
                            source: sourceDOI,
                            target: refDOI
                        });
                    }
                });
            });

            // Add fallback link for disjoint nodes in a cluster
            if (cluster.length > 1) {
                const firstNode = cluster[0];
                cluster.forEach((node, index) => {
                    if (node.doi !== firstNode.doi) {
                        // Link any disjoint node to the first node in the cluster
                        allLinks.push({
                            source: node.doi,
                            target: firstNode.doi
                        });
                    }
                });
            }
        });

        return {
            nodes: processedNodes,
            links: allLinks,
            grid: {
                size: gridSize,
                cellWidth,
                cellHeight
            }
        };
    }


    initSVG() {
        this.svg = d3.select("#graph").append("svg")
            .attr("width", this.width).attr("height", this.height)
            .call(d3.zoom().on("zoom", e => this.svgGroup.attr("transform", e.transform)));

        this.svgGroup = this.svg.append("g");
    }

    initializeSimulation(graphData) {
        const { nodes, links, grid } = graphData;
        const { size: gridSize, cellWidth, cellHeight } = grid;

        const link = this.svgGroup.selectAll(".link")
            .data(links).enter().append("line")
            .attr("class", "link")
            .attr("stroke-width", 4);

        const node = this.svgGroup.selectAll(".node")
            .data(nodes, d => d.doi).enter().append("circle")
            .attr("class", "node").attr("r", 100).style("fill", d => d.color)
            .attr("stroke", "#fff").attr("stroke-width", 1.5)
            .on("mouseover", (e, d) => this.showTooltip(e, d))
            .on("mouseout", () => this.hideTooltip())
            .on("click", (_, d) => window.open(d.url, '_blank'))
            .call(d3.drag()
                .on("start", (e, d) => this.dragstarted(e, d))
                .on("drag", (e, d) => this.dragged(e, d))
                .on("end", (e, d) => this.dragended(e, d))
            );

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id(d => d.doi)
                .distance(80)
                .strength(0.7))
            .force("x", d3.forceX(d => d.x).strength(1))
            .force("y", d3.forceY(d => d.y).strength(1))
            .force("collision", d3.forceCollide(200))
            .alpha(1)
            .alphaDecay(0.1)
            .velocityDecay(0.1)
            .on("tick", () => this.tickHandler(link, node));

        this.simulation.force("cluster", d3.forceY(d => {
            const row = Math.floor(d.cluster / gridSize);
            return row * cellHeight + cellHeight / 2;
        }).strength(0.1));

        this.simulation.force("clusterX", d3.forceX(d => {
            const col = d.cluster % gridSize;
            return col * cellWidth + cellWidth / 2;
        }).strength(0.1));

    }

    tickHandler(link, node) {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }


    showTooltip(event, d) {
        const topicTags = d.topics.map(term => `
            <span style="background:${this.termColors[term]};color:white;padding:2px 8px;border-radius:12px;margin:2px;display:inline-block;font-size:0.8em;">${term}</span>
        `).join('');

        this.tooltip.style("opacity", 1).html(`
            <div style="text-align:center;padding:8px;">
                <strong style="display:block;margin-bottom:6px;">${d.title}</strong>
                <div>${d.authors.join(", ")}</div>
                <div style="margin:4px 0;">${d.doi}</div>
                <div style="margin-top:6px;">${topicTags}</div>
            </div>
        `).style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
    }

    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }

    createLegend() {
        this.legend = d3.select("body").append("div").attr("class", "legend")
            .style("background", "#171E28").style("padding", "12px 16px")
            .style("border-radius", "8px").style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
            .style("color", "white").style("text-align", "center")
            .html("<h2 style='margin:0 0 12px 0; font-size:1.2em;'>Topics</h2>");

        const legendItems = this.legend.append("div")
            .style("display", "flex").style("flex-direction", "column").style("gap", "6px");

        Object.entries(this.termColors).forEach(([term, color]) => {
            const item = legendItems.append("div")
                .style("display", "flex").style("justify-content", "center")
                .style("cursor", "pointer").on("click", () => this.handleLegendClick(term));

            item.append("span")
                .style("background", color).style("color", "white")
                .style("padding", "5px 14px").style("border-radius", "15px")
                .style("font-size", "0.85em").style("display", "inline-block")
                .style("text-align", "center").style("transition", "all 0.2s ease")
                .style("border", "2px solid transparent").text(term);
        });
    }

    handleLegendClick(term) {
        this.activeFilters.has(term) ? this.activeFilters.delete(term) : this.activeFilters.add(term);
        this.updateLegendAppearance();
        this.updateNodeVisibility();
    }

    updateLegendAppearance() {
        this.legend.selectAll("div").each((_, i, nodes) => {
            const span = d3.select(nodes[i]).select("span");
            const term = span.text();
            const isActive = this.activeFilters.has(term);
            span.style("border", isActive ? "2px solid white" : "2px solid transparent")
                .style("transform", isActive ? "scale(1.05)" : "scale(1)");
        });
    }

    updateNodeVisibility() {
        this.svgGroup.selectAll(".node").transition().duration(200)
            .style("opacity", d =>
                this.activeFilters.size === 0 || d.topics.some(t => this.activeFilters.has(t)) ? 1 : 0.2
            );
    }

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip").style("opacity", 0);
    }

    destroy() {
        this.svg?.remove();
        this.tooltip?.remove();
        this.legend?.remove();
    }
}

new GraphVisualizer();

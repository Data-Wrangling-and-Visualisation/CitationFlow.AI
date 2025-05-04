import { getNodes } from './api.js';
import { COLOR_SCHEMES } from './config.js';

export class GraphVisualizer {
    constructor() {
        this.config();
        this.init();
    }

    config() {
        this.node_num = 3280;
        this.topology = "RING";
        this.colorScheme = "pastel";
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.activeFilters = new Set();

        const topologySelect = document.getElementById("topology-select");
        const applyButton = document.getElementById("apply-button");
        const nodesSlider = document.getElementById("nodes-slider");
        const nodesCountLabel = document.getElementById("nodes-count");
        const colorSchemeSelect = document.getElementById("color-scheme-select");

        topologySelect.value = this.topology;
        colorSchemeSelect.value = this.colorScheme;

        topologySelect.addEventListener("change", e => {
            this.topology = e.target.value;
        });

        colorSchemeSelect.addEventListener("change", e => {
            this.colorScheme = e.target.value;
        });

        nodesSlider.value = this.node_num;
        nodesCountLabel.textContent = this.node_num;

        nodesSlider.addEventListener("input", e => {
            this.node_num = parseInt(e.target.value);
            nodesCountLabel.textContent = this.node_num;
        });

        applyButton.addEventListener("click", () => {
            console.log("Applying topology:", this.topology, "with nodes:", this.node_num, "and scheme:", this.colorScheme);
            this.reloadSimulation();
        });
    }


    init() {
        this.createTooltip();
        this.initSVG();
        this.loadAndVisualizeData();
    }

    reloadSimulation() {
        if (this.simulation) {
            this.simulation.stop();
        }

        d3.select("#graph").select("svg").remove();
        this.tooltip?.remove();
        this.legend?.remove();

        this.init();  // Properly reinitialize
    }

    async loadAndVisualizeData() {
        try {
            const rawNodes = await getNodes(this.node_num);

            const allTerms = new Set();
            rawNodes.forEach(node => {
                if (Array.isArray(node.topics)) {
                    node.topics.forEach(term => allTerms.add(term));
                }
            });

            const uniqueTerms = Array.from(allTerms);
            const colorScale = d3.scaleLinear()
                .domain(d3.range(0, 1 + 1e-9, 1 / (COLOR_SCHEMES[this.colorScheme].length - 1)))
                .range(COLOR_SCHEMES[this.colorScheme])
                .interpolate(d3.interpolateRgb);

            const colorMap = new Map();
            uniqueTerms.forEach((term, i) => {
                const t = i / (uniqueTerms.length - 1 || 1);
                colorMap.set(term, colorScale(t));
            });

            this.termColors = Object.fromEntries(colorMap);
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
        const nodeRefsMap = new Map();

        nodes.forEach(n => nodeRefsMap.set(n.doi, new Set(n.refs || [])));

        for (const node of nodes) {
            if (visited.has(node.doi)) continue;

            const cluster = new Set([node.doi]);
            const queue = [node.doi];
            visited.add(node.doi);

            while (queue.length > 0) {
                const current = queue.shift();
                for (const other of nodes) {
                    if (visited.has(other.doi)) continue;
                    if (nodeRefsMap.get(other.doi).has(current) || nodeRefsMap.get(current).has(other.doi)) {
                        cluster.add(other.doi);
                        visited.add(other.doi);
                        queue.push(other.doi);
                    }
                }
            }

            const fullCluster = Array.from(cluster);
            for (let i = 0; i < fullCluster.length; i += 10) {
                const chunk = fullCluster.slice(i, i + 10);
                clusters.push(chunk.map(doi => nodes.find(n => n.doi === doi)));
            }
        }

        const filteredClusters = clusters.filter(c => c.length > 2);
        const gridSize = Math.ceil(Math.sqrt(filteredClusters.length));
        const cellWidth = 40000 / gridSize;
        const cellHeight = 40000 / gridSize;

        const processedNodes = [];
        const allLinks = [];
        const nodeMap = new Map();

        filteredClusters.forEach((cluster, i) => {
            let centerX, centerY;

            switch (this.topology) {
                case "GRID":
                    const row = Math.floor(i / gridSize);
                    const col = i % gridSize;
                    centerX = col * cellWidth + cellWidth / 2 - 25000;
                    centerY = row * cellHeight + cellHeight / 2 - 25000;
                    break;
                case "RING":
                    const ring = Math.floor(Math.log2(i / 4 + 1));
                    const step = 2 * Math.PI / (Math.pow(2, ring + 2));

                    centerX = Math.cos(i * step) * ring * 7000 + 500;
                    centerY = Math.sin(i * step) * ring * 7000 + 500;
                    break;
                case "FUN":
                    centerX = Math.random() * 50000;
                    centerY = Math.random() * 50000;
                    break;
                case "DISK":
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = Math.sqrt(Math.random()) * 15000;
                    centerX = Math.cos(angle) * radius;
                    centerY = Math.sin(angle) * radius;
                    break;
            }

            cluster.forEach(node => {
                const n = {
                    ...node,
                    color: this.termColors[node.topics?.[0]] || "#ccc",
                    x: centerX,
                    y: centerY,
                    cluster: i
                };
                processedNodes.push(n);
                nodeMap.set(node.doi, n);
            });
        });

        filteredClusters.forEach(cluster => {
            cluster.forEach(node => {
                const refs = nodeRefsMap.get(node.doi) || [];
                refs.forEach(ref => {
                    const target = nodeMap.get(ref);
                    if (target && target.cluster === node.cluster) {
                        allLinks.push({ source: node.doi, target: ref });
                    }
                });
            });

            if (cluster.length > 1) {
                const first = cluster[0];
                cluster.forEach(n => {
                    if (n.doi !== first.doi) {
                        allLinks.push({ source: n.doi, target: first.doi });
                    }
                });
            }
        });

        return { nodes: processedNodes, links: allLinks };
    }

    initSVG() {
        this.svg = d3.select("#graph").append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        this.svgGroup = this.svg.append("g");

        this.svg.call(d3.zoom().on("zoom", e => {
            this.svgGroup.attr("transform", e.transform);
        }));
    }

    initializeSimulation(graphData) {
        const { nodes, links } = graphData;

        const link = this.svgGroup.selectAll(".link")
            .data(links).enter().append("line")
            .attr("class", "link")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 10);

        const node = this.svgGroup.selectAll(".node")
            .data(nodes, d => d.doi).enter().append("circle")
            .attr("class", "node")
            .attr("r", 100)
            .style("fill", d => d.color)
            .on("mouseover", (e, d) => this.showTooltip(e, d))
            .on("mouseout", (e, d) => this.hideTooltip(e, d))
            .on("click", (_, d) => this.showArticleInfo(d))
            .call(d3.drag()
                .on("start", (e, d) => this.dragstarted(e, d))
                .on("drag", (e, d) => this.dragged(e, d))
                .on("end", (e, d) => this.dragended(e, d)));

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.doi).distance(200).strength(0.5))
            .force("x", d3.forceX(d => d.x).strength(0.5))
            .force("y", d3.forceY(d => d.y).strength(0.5))
            .force("collision", d3.forceCollide(200).strength(1))
            .velocityDecay(0.5)
            .on("tick", () => this.tickHandler(link, node));
    }

    showArticleInfo(d) {
        const infoPanel = document.getElementById("article-info");
        const dateOnly = d.date.split("T")[0]; // Extract only the date part
        const truncateText = (text, maxLength) => text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

        infoPanel.innerHTML = `
            <h3>${truncateText(d.title, 100)}</h3>
            <p>${truncateText(d.authors.join(", "), 70)}</p>
            <p>${dateOnly}</p>
            <p><a href="https://doi.org/${d.doi}" target="_blank"><img src="../static/DOI_logo.svg" alt="DOI" style="height:64px;vertical-align:middle;"></a>
            <a href="https://sci-hub.se/${d.doi}" target="_blank"><img src="../static/pdf_logo.svg" alt="PDF" style="height:64px;vertical-align:middle;"></a></p>
            <div>${d.topics.map(t => `<span style="background:${this.termColors[t]};padding:2px 6px;border-radius:10px;margin-right:4px;">${truncateText(t, 30)}</span>`).join('')}</div>
        `;
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

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "#333")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "8px")
            .style("pointer-events", "none");
    }


    showTooltip(event, d) {
        const topicTags = d.topics.map(term => `
            <span style="background:${this.termColors[term]};color:white;padding:2px 8px;border-radius:12px;margin:2px;display:inline-block;font-size:0.8em;">${term}</span>
        `).join('');

        d3.select(event.target)
            .transition()
            .duration(200)
            .attr("r", 144);

        this.tooltip.style("opacity", 1).html(`
            <div style="text-align:center;padding:8px;">
                <strong style="display:block;margin-bottom:6px;">${d.title}</strong>
                <div>${d.authors.join(", ")}</div>
                <div style="margin:4px 0;">${d.doi}</div>
                <div style="margin-top:6px;">${topicTags}</div>
            </div>
        `).style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
    }

    hideTooltip(event, d) {
        d3.select(event.target)
            .transition()
            .duration(200)
            .attr("r", 100);
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

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    destroy() {
        this.svg?.remove();
        this.tooltip?.remove();
        this.legend?.remove();
    }
}

new GraphVisualizer();

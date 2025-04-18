import { getNodes } from './api.js';

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

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip").style("opacity", 0);
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

            const colorMap = new Map();
            uniqueTerms.forEach((term, index) => {
                const t = index / (uniqueTerms.length - 1 || 1);
                colorMap.set(term, d3.interpolateRgb("blue", "purple")(t));
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
        const doiMap = new Map();

        const processedNodes = nodes.map(node => {
            const spread = 10000;
            const centerX = this.width / 2;
            const centerY = this.height / 2;

            const nodeObj = {
                ...node,
                id: node.doi,
                x: centerX + (Math.random() - 0.5) * spread,
                y: centerY + (Math.random() - 0.5) * spread,
                color: this.termColors[node.topics[0]]
            };
            doiMap.set(node.doi, nodeObj);
            return nodeObj;
        });

        const links = processedNodes.flatMap(source =>
            source.refs.map(targetDOI => doiMap.get(targetDOI))
                .filter(Boolean)
                .map(target => ({ source: source.id, target: target.id }))
        );

        return { nodes: processedNodes, links };
    }

    initSVG() {
        this.svg = d3.select("#graph").append("svg")
            .attr("width", this.width).attr("height", this.height)
            .call(d3.zoom().on("zoom", e => this.svgGroup.attr("transform", e.transform)));

        this.svgGroup = this.svg.append("g");
    }

    initializeSimulation(graphData) {
        const link = this.svgGroup.selectAll(".link")
            .data(graphData.links).enter().append("line")
            .attr("class", "link");

        const node = this.svgGroup.selectAll(".node")
            .data(graphData.nodes, d => d.id).enter().append("circle")
            .attr("class", "node").attr("r", 16).style("fill", d => d.color)
            .attr("stroke", "#fff").attr("stroke-width", 1.5)
            .on("mouseover", (e, d) => this.showTooltip(e, d))
            .on("mouseout", () => this.hideTooltip())
            .on("click", (_, d) => window.open(d.url, '_blank'))
            .call(d3.drag()
                .on("start", (e, d) => this.dragstarted(e, d))
                .on("drag", (e, d) => this.dragged(e, d))
                .on("end", (e, d) => this.dragended(e, d))
            );

        this.simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(80).strength(1.5))
            .force("charge", d3.forceManyBody().strength(-1))
            .force("collision", d3.forceCollide().radius(100))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .alphaDecay(0.1).velocityDecay(0.3)
            .on("tick", () => this.tickHandler(link, node));
    }

    tickHandler(link, node) {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

        node.attr("cx", d => d.x).attr("cy", d => d.y);
    }

    showTooltip(event, d) {
        const topicTags = d.topics.map(term => `
            <span style="background:${this.termColors[term]};color:white;padding:2px 8px;border-radius:12px;margin:2px;display:inline-block;font-size:0.8em;">${term}</span>
        `).join('');

        this.tooltip.style("opacity", 1).html(`
            <div style="text-align:center;padding:8px;">
                <strong style="display:block;margin-bottom:6px;">${d.title}</strong>
                <div>${d.authors.join(", ")}</div>
                <div style="margin:4px 0;">${d.id}</div>
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

    hexToRgb(hex) {
        return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.05).restart();
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

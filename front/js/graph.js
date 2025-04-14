import { getNodes, getNodeInfo, getNodeRefs } from './api.js';

export class GraphVisualizer {
    constructor() {
        this.termColors = {
            'AI': '#FF6B6B',
            'ML': '#4ECDC4',
            'Bioinformatics': '#45B7D1',
            'NLP': '#96CEB4',
            'Vision': '#FFEEAD',
            'Data Mining': '#D4A5A5'
        };

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.activeFilters = new Set();

        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.initSVG();
        this.loadData();
        this.createLegend();
    }

    initSVG() {
        this.svg = d3.select("#graph")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .call(d3.zoom().on("zoom", event => {
                this.svgGroup.attr("transform", event.transform);
            }));

        this.svgGroup = this.svg.append("g");
    }

    async loadData() {
        try {
            const nodes = await getNodes();
            const graphData = await this.processData(nodes);
            this.initializeSimulation(graphData);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    async processData(nodes) {
        const doiMap = new Map();
        const processedNodes = await Promise.all(nodes.map(async (node) => {
            const details = await getNodeInfo(node.doi);
            const refs = await getNodeRefs(node.doi);

            const nodeObj = {
                id: node.doi,
                title: details.title,
                authors: details.authors,
                topics: details.topics,
                url: details.url,
                refs: refs,
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                color: this.blendColors(details.topics)
            };

            doiMap.set(node.doi, nodeObj);
            return nodeObj;
        }));

        const links = processedNodes.flatMap(source =>
            source.refs
                .map(targetDOI => doiMap.get(targetDOI))
                .filter(Boolean)
                .map(target => ({ source: source.id, target: target.id }))
        );

        return { nodes: processedNodes, links };
    }

    initializeSimulation(graphData) {
        const link = this.svgGroup.selectAll(".link")
            .data(graphData.links)
            .enter().append("line")
            .attr("class", "link");

        const node = this.svgGroup.selectAll(".node")
            .data(graphData.nodes, d => d.id)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 8)
            .style("fill", d => d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .on("mouseover", (event, d) => this.showTooltip(event, d))
            .on("mouseout", () => this.hideTooltip())
            .on("click", (_, d) => window.open(d.url, '_blank'))
            .call(d3.drag()
                .on("start", (event, d) => this.dragstarted(event, d))
                .on("drag", (event, d) => this.dragged(event, d))
                .on("end", (event, d) => this.dragended(event, d))
            );

        graphData.nodes.forEach(d => {
            d.x = this.width / 2 + (Math.random() - 0.5) * 100;
            d.y = this.height / 2 + (Math.random() - 0.5) * 100;
        });

        this.simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.links)
                .id(d => d.id)
                .distance(80).strength(1.5))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(this.width / 2, this.height / 2).strength(1))
            .force("collision", d3.forceCollide().radius(100))
            .force("x", d3.forceX(this.width / 2).strength(0.01))
            .force("y", d3.forceY(this.height / 2).strength(0.01))
            .alphaDecay(0.05)
            .velocityDecay(0.4)
            .on("tick", () => this.tickHandler(link, node));
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
            <span style="
                background: ${this.termColors[term]};
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                margin: 2px;
                display: inline-block;
                font-size: 0.8em;
            ">${term}</span>
        `).join('');

        this.tooltip
            .style("opacity", 1)
            .html(`
                <div style="text-align: center; padding: 8px;">
                    <strong style="display: block; margin-bottom: 6px;">${d.title}</strong>
                    <div>${d.authors.join(", ")}</div>
                    <div style="margin: 4px 0;">${d.id}</div>
                    <div style="margin-top: 6px;">${topicTags}</div>
                </div>
            `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`);
    }

    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }

    createLegend() {
        this.legend = d3.select("body").append("div")
            .attr("class", "legend")
            .style("background", "#171E28")
            .style("padding", "12px 16px")
            .style("border-radius", "8px")
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
            .style("color", "white")
            .style("text-align", "center")
            .html("<h2 style='margin:0 0 12px 0; font-size:1.2em;'>Topics</h2>");

        const legendItems = this.legend.append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "6px");

        Object.entries(this.termColors).forEach(([term, color]) => {
            const item = legendItems.append("div")
                .style("display", "flex")
                .style("justify-content", "center")
                .style("cursor", "pointer")
                .on("click", () => this.handleLegendClick(term));

            item.append("span")
                .style("background", color)
                .style("color", "white")
                .style("padding", "5px 14px")
                .style("border-radius", "15px")
                .style("font-size", "0.85em")
                .style("display", "inline-block")
                .style("text-align", "center")
                .style("transition", "all 0.2s ease")
                .style("border", "2px solid transparent")
                .text(term);
        });
    }

    handleLegendClick(clickedTerm) {
        this.activeFilters.has(clickedTerm)
            ? this.activeFilters.delete(clickedTerm)
            : this.activeFilters.add(clickedTerm);

        this.updateLegendAppearance();
        this.updateNodeVisibility();
    }

    updateLegendAppearance() {
        const self = this;
        this.legend.selectAll("div")
            .each(function () {
                const span = d3.select(this).select("span");
                const term = span.text();
                const isActive = self.activeFilters.has(term);

                span
                    .style("border", isActive ? "2px solid white" : "2px solid transparent")
                    .style("transform", isActive ? "scale(1.05)" : "scale(1)");
            });
    }

    updateNodeVisibility() {
        this.svgGroup.selectAll(".node")
            .transition()
            .duration(200)
            .style("opacity", d => {
                if (this.activeFilters.size === 0) return 1;
                return d.topics.some(t => this.activeFilters.has(t)) ? 1 : 0.2;
            });
    }

    blendColors(terms) {
        if (!terms?.length) return '#CCCCCC';
        const validTerms = terms.filter(term => this.termColors[term]);
        if (!validTerms.length) return '#CCCCCC';

        const sumRGB = validTerms
            .map(term => this.hexToRgb(this.termColors[term]))
            .reduce((acc, rgb) => acc.map((val, i) => val + rgb[i]), [0, 0, 0]);

        const avgRGB = sumRGB.map(val => Math.round(val / validTerms.length));
        return `rgb(${avgRGB.join(',')})`;
    }

    hexToRgb(hex) {
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
        ];
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
        if (this.svg) this.svg.remove();
        if (this.tooltip) this.tooltip.remove();
        if (this.legend) this.legend.remove();
    }
}

new GraphVisualizer();

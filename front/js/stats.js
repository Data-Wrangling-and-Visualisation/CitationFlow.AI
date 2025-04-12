import { getNodes, getNodeInfo } from './dummy_api.js';

export class StatsVisualizer {
    constructor() {
        this.termColors = new Map([
            ['AI', '#FF6B6B'],
            ['ML', '#4ECDC4'],
            ['Bioinformatics', '#45B7D1'],
            ['NLP', '#96CEB4'],
            ['Vision', '#FFEEAD'],
            ['Data Mining', '#D4A5A5']
        ]);

        this.nodes = []; // Store nodes with detailed information
        this.initContainer();
        this.loadData();
    }

    initContainer() {
        this.container = d3.select("#chart-container"); // Update chart container ID

        // Clear any previous content
        this.container.html('');
    }

    async loadData() {
        try {
            // Fetch node data
            const nodes = await getNodes();

            // Fetch detailed info for each node
            const nodeDetailsPromises = nodes.map(async (node) => {
                const details = await getNodeInfo(node.doi);
                this.nodes.push({
                    id: node.doi,
                    title: details.title,
                    authors: details.authors,
                    topics: details.topics,
                    url: details.url,
                    refs: details.refs
                });
            });

            await Promise.all(nodeDetailsPromises);

            // Process the nodes and update the pie chart
            const processedData = await this.processNodes(this.nodes);
            this.createChart(processedData);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    async processNodes(nodes) {
        const termCounts = new Map();
        let totalTerms = 0;

        nodes.forEach(node => {
            node.topics.forEach(term => {
                if (this.termColors.has(term)) {
                    termCounts.set(term, (termCounts.get(term) || 0) + 1);
                    totalTerms++;
                }
            });
        });

        return Array.from(this.termColors.keys()).map(term => ({
            term,
            count: termCounts.get(term) || 0,
            percentage: ((termCounts.get(term) || 0) / totalTerms * 100).toFixed(1)
        })).filter(d => d.count > 0);
    }

    createChart(data) {
        const width = 500;
        const height = 500;
        const radius = Math.min(width, height) / 2;

        const svg = this.container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(radius * 0.5) // Donut effect
            .outerRadius(radius * 0.85)
            .padAngle(0.02);

        const labelArc = d3.arc()
            .innerRadius(radius * 0.95)
            .outerRadius(radius * 0.95);

        const arcs = svg.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");

        // Add animated slices
        arcs.append("path")
            .attr("fill", d => this.termColors.get(d.data.term))
            .attr("stroke", "#171E28")
            .attr("stroke-width", "2")
            .transition()
            .duration(3000)
            .attrTween("d", function (d) {
                const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return t => arc(i(t));
            });

        // Optional: show central label
        svg.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", "#FFF")
            .text("Topic Distribution");

        // Tooltip interaction
        arcs.on("mouseover", (event, d) => this.showTooltip(event, d.data))
            .on("mousemove", (event) => {
                d3.select(".tooltip")
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY + 15}px`);
            })
            .on("mouseout", () => this.hideTooltip())
            .on("click", (event, d) => this.highlightSlice(d));
    }

    highlightSlice(selectedData) {
        const allPaths = this.container.selectAll(".arc path");

        allPaths
            .transition()
            .duration(300)
            .style("opacity", d =>
                d.data.term === selectedData.data.term ? 1 : 0.2
            );

        // Optional: toggle behavior (click again to reset)
        this.selectedTerm = this.selectedTerm === selectedData.data.term ? null : selectedData.data.term;

        if (!this.selectedTerm) {
            allPaths.transition().duration(300).style("opacity", 1);
            this.clearTable(); // Clear the table when no term is selected
        } else {
            this.populateTable(selectedData.data.term); // Populate the table with the selected term's data
        }
    }

    populateTable(term) {
        const articles = this.nodes.filter(node => node.topics.includes(term));  // Filter nodes for articles related to the selected term

        const tableContainer = d3.select("#articles-table");

        // Clear any previous content
        tableContainer.html('');

        // Create the table
        const table = tableContainer.append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse")
            .style("margin-top", "20px");

        // Table header
        const header = table.append("thead").append("tr");
        header.append("th").text("Title").style("text-align", "center");
        header.append("th").text("Authors").style("text-align", "center");
        header.append("th").text("DOI").style("text-align", "center");

        // Table body
        const tbody = table.append("tbody");

        // Add rows for each article
        articles.forEach(article => {
            const row = tbody.append("tr");

            row.append("td").text(article.title);
            row.append("td").text(article.authors.join(", "));

            // Make DOI clickable and hide the URL column
            row.append("td")
                .html(`<a href="${article.url}" target="_blank">${article.id}</a>`);
        });
    }

    clearTable() {
        d3.select("#articles-table").html(''); // Clear the table content
    }

    showTooltip(event, data) {
        this.hideTooltip(); // Remove any existing tooltips

        d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("left", `${event.pageX + 30}px`)
            .style("top", `${event.pageY + 30}px`)
            .style("opacity", 0)
            .html(`
                <center><strong>${data.term}</strong></center>
                Count: ${data.count}<br>
                Percentage: ${data.percentage}%
            `)
            .transition()
            .duration(200)
            .style("opacity", 1);
    }

    hideTooltip() {
        d3.selectAll(".tooltip")
            .transition()
            .duration(200)
            .style("opacity", 0)
            .remove();
    }
}

new StatsVisualizer();

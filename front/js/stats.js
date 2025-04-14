import { getNodes, getNodeInfo } from './dummy_api.js';

class Nodes {
    constructor() {
        this.nodes = [];
    }

    async loadNodes() {
        try {
            const basicNodes = await getNodes();

            const nodeDetailsPromises = basicNodes.map(async (node) => {
                const details = await getNodeInfo(node.doi);
                return {
                    id: node.doi,
                    title: details.title,
                    authors: details.authors,
                    topics: details.topics,
                    url: details.url,
                    refs: details.refs,
                    date: details.date
                };
            });

            this.nodes = await Promise.all(nodeDetailsPromises);
        } catch (error) {
            console.error("Error loading nodes:", error);
        }
    }

    getAllNodes() {
        return this.nodes;
    }
}

export class TopicsPlot {
    constructor() {
        this.gradient = d3.interpolateRgb("blue", "purple"); // or d3.interpolateRainbow, interpolateViridis, etc.

        this.nodesManager = new Nodes();  // Use the Nodes class
        this.initContainer();
        this.loadAndRender();
    }

    extractAllTerms(nodes) {
        const termSet = new Set();
        nodes.forEach(node => {
            node.topics.forEach(term => termSet.add(term));
        });
        return Array.from(termSet).sort(); // optionally sort for consistency
    }

    generateTermColors(terms) {
        const scale = d3.scaleLinear()
            .domain([0, terms.length - 1])
            .range([0, 1]);

        const colorMap = new Map();
        terms.forEach((term, i) => {
            colorMap.set(term, this.gradient(scale(i)));
        });

        return colorMap;
    }

    initContainer() {
        this.container = d3.select("#chart-container");
        this.container.html('');
    }

    async loadAndRender() {
        await this.nodesManager.loadNodes();
        this.nodes = this.nodesManager.getAllNodes();

        // Dynamically extract terms from nodes
        this.terms = this.extractAllTerms(this.nodes);
        this.termColors = this.generateTermColors(this.terms);

        const processedData = this.processNodes(this.nodes);
        this.createChart(processedData);
    }


    processNodes(nodes) {
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

        const pie = d3.pie().value(d => d.count).sort(null);
        const arc = d3.arc()
            .innerRadius(radius * 0.5)
            .outerRadius(radius * 0.85)
            .padAngle(0.02);

        const arcs = svg.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");

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

        svg.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", "#FFF")
            .text("Topic Distribution");

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

        this.selectedTerm = this.selectedTerm === selectedData.data.term ? null : selectedData.data.term;

        if (!this.selectedTerm) {
            allPaths.transition().duration(300).style("opacity", 1);
            this.clearTable();
        } else {
            this.populateTable(selectedData.data.term);
        }
    }

    populateTable(term) {
        const articles = this.nodes.filter(node => node.topics.includes(term));
        const tableContainer = d3.select("#articles-table");
        tableContainer.html('');

        const table = tableContainer.append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse")
            .style("margin-top", "20px");

        const header = table.append("thead").append("tr");
        header.append("th").text("Title").style("text-align", "center");
        header.append("th").text("Authors").style("text-align", "center");
        header.append("th").text("DOI").style("text-align", "center");

        const tbody = table.append("tbody");

        articles.forEach(article => {
            const row = tbody.append("tr");
            row.append("td").text(article.title);
            row.append("td").text(article.authors.join(", "));
            row.append("td").html(`<a href="${article.url}" target="_blank">${article.id}</a>`);
        });
    }

    clearTable() {
        d3.select("#articles-table").html('');
    }

    showTooltip(event, data) {
        this.hideTooltip();

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


export class DatePlot {
    constructor() {
        this.nodesManager = new Nodes();  // Use the Nodes class
        this.initContainer();
        this.loadAndRender();
    }

    initContainer() {
        this.container = d3.select("#year-bar");
        this.container.html('');
    }

    async loadAndRender() {
        await this.nodesManager.loadNodes();
        this.nodes = this.nodesManager.getAllNodes();

        const processedData = this.processNodes(this.nodes);
        this.createBarChart(processedData);
    }

    processNodes(nodes) {
        const yearCounts = new Map();
        let totalArticles = 0;

        nodes.forEach(node => {
            const year = node.date ? node.date.split("T")[0].split("-")[0] : "Unknown"; // Extract year
            yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
            totalArticles++;
        });

        return Array.from(yearCounts.entries())
            .map(([year, count]) => ({
                year,
                count,
                percentage: ((count / totalArticles) * 100).toFixed(1)
            }));
    }

    createBarChart(data) {
        const width = 500;
        const height = 400;
        const margin = { top: 40, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = this.container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create a linear scale to map years to the 0–1 range
        const yearExtent = d3.extent(data, d => d.year);
        const colorPosition = d3.scaleLinear()
            .domain(yearExtent)
            .range([0, 1]);

        const colorScale = d => d3.interpolateRgb("blue", "purple")(colorPosition(d.year));

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .nice()
            .range([0, chartWidth]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.year))
            .range([0, chartHeight])
            .padding(0.2);

        svg.append("g")
            .attr("transform", `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "12px");

        const bars = svg.selectAll(".bar")
            .data(data)
            .enter().append("g")
            .attr("class", "bar");

        bars.append("rect")
            .attr("x", 0)
            .attr("y", d => y(d.year))
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("fill", d => colorScale(d))
            .on("click", (event, d) => this.highlightBarAndShowTable(d)) // <-- Moved here
            .transition()
            .duration(3000)
            .attr("width", d => x(d.count));

        svg.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", "#FFF");
    }

    highlightBarAndShowTable(selectedData) {
        const year = selectedData.year;

        // Highlight selected bar (by selecting the rect directly within .bar group)
        d3.selectAll(".bar rect")
            .transition()
            .duration(300)
            .style("opacity", d => d.year === year ? 1 : 0.2);  // Apply opacity to individual bars

        this.selectedYear = this.selectedYear === year ? null : year;

        if (!this.selectedYear) {
            // Reset all bars to full opacity
            d3.selectAll(".bar rect")
                .transition().duration(300)
                .style("opacity", 1);
            this.clearTable();
        } else {
            this.populateTable(year);
        }
    }

    populateTable(year) {
        const articles = this.nodes.filter(node => node.date && node.date.startsWith(year));
        const tableContainer = d3.select("#year-table");
        tableContainer.html('');

        const table = tableContainer.append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse")
            .style("margin-top", "20px");

        const header = table.append("thead").append("tr");
        header.append("th").text("Title").style("text-align", "center");
        header.append("th").text("Authors").style("text-align", "center");
        header.append("th").text("DOI").style("text-align", "center");

        const tbody = table.append("tbody");

        articles.forEach(article => {
            const row = tbody.append("tr");
            row.append("td").text(article.title);
            row.append("td").text(article.authors.join(", "));
            row.append("td").html(`<a href="${article.url}" target="_blank">${article.id}</a>`);
        });
    }

    clearTable() {
        d3.select("#year-table").html('');
    }
}

export class AuthorBubbles {
    constructor() {
        this.containerId = "author-bubbles";
        this.nodes = [];
        this.authorData = [];
        this.initContainer();
        this.loadNodesAndRender();
    }

    initContainer() {
        // Ensure container exists and has valid dimensions
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container #${this.containerId} not found`);
            return;
        }

        this.width = container.clientWidth || 1500;
        this.height = 800;

        // Add responsive styling
        container.style.position = 'relative';
        container.innerHTML = ''; // Clear previous content
    }

    async loadNodesAndRender() {
        try {
            await this.loadNodes();
            this.processAuthors();

            if (this.authorData.length === 0) {
                this.showErrorMessage("No author data available");
                return;
            }

            this.render();
        } catch (error) {
            console.error("Failed to load and render:", error);
            this.showErrorMessage("Failed to load data");
        }
    }

    async loadNodes() {
        try {
            const basicNodes = await getNodes();
            this.nodes = await Promise.all(
                basicNodes.map(async node => {
                    const details = await getNodeInfo(node.doi);
                    return {
                        id: node.doi,
                        title: details.title,
                        authors: details.authors || [], // Handle missing authors
                        topics: details.topics,
                        url: details.url,
                        refs: details.refs,
                        date: details.date
                    };
                })
            );
        } catch (error) {
            console.error("Node loading failed:", error);
            throw error;
        }
    }

    processAuthors() {
        const authorCounts = new Map();

        this.nodes.forEach(node => {
            (node.authors || []).forEach(author => { // Handle missing authors
                authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
            });
        });

        this.authorData = Array.from(authorCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }));
    }

    render() {

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "bubble-chart-tooltip")
            .style("opacity", 0);

        const svg = d3.select(`#${this.containerId}`)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .style("background", "transparent");


        // Create hierarchy with proper value handling
        const root = d3.hierarchy({ children: this.authorData })
            .sum(d => d.value || 0) // Fix: Handle missing values
            .sort((a, b) => b.value - a.value);

        const pack = d3.pack()
            .size([this.width, this.height])
            .padding(3);

        const nodes = pack(root).leaves();

        // Color scale with better contrast
        // Get the min and max value for proper scaling
        const valueExtent = d3.extent(this.authorData, d => d.value);

        // Linear scale to normalize value for color interpolation
        const colorPosition = d3.scaleLinear()
            .domain(valueExtent)
            .range([0, 1]);

        // RGB color interpolator from light to dark (feel free to change)
        const colorInterpolator = d3.interpolateRgb("blue", "purple");


        // Node groups with optimized rendering
        const nodeGroups = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        // Circles with hover effects
        nodeGroups.append("circle")
            .attr("class", "bubble")
            .attr("r", d => d.r)
            .style("fill", d => colorInterpolator(colorPosition(d.data.value)))
            .style("stroke", "rgba(255, 255, 255, 0.8)")
            .style("stroke-width", 1.5)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("stroke-width", 3);

                tooltip
                    .style("opacity", 1)
                    .html(`
            <div style="margin-bottom: 4px; font-weight: 600">${d.data.name}</div>
            <div>Articles: ${d.data.value}</div>
          `);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("stroke-width", 1.5);

                tooltip.style("opacity", 0);
            })
            .style("animation", "bubble-emerge 0.6s ease-out");

        // Modified text labels
        nodeGroups.append("text")
            .attr("class", "bubble-label")
            .text(d => d.data.name)
            .attr("dy", "0.35em") /* Slightly adjusted vertical alignment */
            .style("font-size", d => `${Math.min(d.r / 2.5, 18)}px`) /* Larger font sizing */
            .style("font-weight", "600")
            .style("letter-spacing", "0.03em")
            .style("text-anchor", "middle")
            .style("paint-order", "stroke") /* Text outline for better contrast */
            .style("stroke", "rgba(0, 0, 0, 0.5)")
            .style("stroke-width", "1px");

    }

    // Helper method for text wrapping
    wrapText(selection) {
        selection.each(function (d) {
            const text = d3.select(this);
            const words = d.data.name.split(/\s+/);
            const maxLength = Math.floor(d.r / 4);

            if (words.some(word => word.length > maxLength)) {
                text.text(words[0].substring(0, maxLength) + "...");
            }
        });
    }

    showErrorMessage(message) {
        d3.select(`#${this.containerId}`)
            .append("div")
            .style("position", "absolute")
            .style("top", "50%")
            .style("left", "50%")
            .style("transform", "translate(-50%, -50%)")
            .style("color", "#ff0000")
            .style("font-weight", "bold")
            .text(message);
    }
}


new TopicsPlot();
new DatePlot();
new AuthorBubbles();

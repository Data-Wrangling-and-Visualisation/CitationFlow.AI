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
        this.termColors = new Map([
            ['AI', '#FF6B6B'],
            ['ML', '#4ECDC4'],
            ['Bioinformatics', '#45B7D1'],
            ['NLP', '#96CEB4'],
            ['Vision', '#FFEEAD'],
            ['Data Mining', '#D4A5A5']
        ]);

        this.nodesManager = new Nodes();  // Use the Nodes class
        this.initContainer();
        this.loadAndRender();
    }

    initContainer() {
        this.container = d3.select("#chart-container");
        this.container.html('');
    }

    async loadAndRender() {
        await this.nodesManager.loadNodes();
        this.nodes = this.nodesManager.getAllNodes();

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

        // Use pastel colors from d3.schemePastel1
        const colorScale = d3.scaleOrdinal(d3.schemePastel1)
            .domain(data.map(d => d.year)); // Assign a unique color to each year

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
            .attr("fill", d => colorScale(d.year))
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



new TopicsPlot();
new DatePlot();

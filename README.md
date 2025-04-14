<div align="center">
  <img src="logo.svg" alt="CitationFlow.AI Logo" width="200"/>

  ### Graph-based Representation of AI Research Field  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue)](https://www.python.org/)
  [![D3.js 7.8+](https://img.shields.io/badge/D3.js-7.8%2B-orange)](https://d3js.org/)
</div>

## 📌 Table of Contents  
- [🚀 Project Overview](#-project-overview)  
- [🛠️ Used Technologies](#%EF%B8%8F-used-technologies)  
- [⚡ Deployment](#-deployment)  
- [🗺️ Roadmap](#%EF%B8%8F-roadmap)  
- [🔮 Future Enhancements](#-future-enhancements)  
- [🙏 Acknowledgements](#-acknowledgements)  
- [👥 Authors](#-authors)  
- [📜 License](#-license)  

---

## 🚀 Project Overview  
**CitationFlow.AI** is an interactive visualization tool that maps AI research literature as a dynamic citation network, helping users uncover trends, connections, and emerging topics.  

### 🔑 Key Features  
| Feature | Description |  
|---------|-------------|  
| **Graph Visualization** | Articles as nodes, citations as edges in an interactive force-directed graph. |  
| **Popularity Metrics** | Node size/color reflects citation count and influence. |  
| **Dynamic Filtering** | Search, filter, and drill down into specific research areas. |  

**Target Audience**: Researchers, AI practitioners, and students exploring AI literature.  

**Data Source**: [ScienceDirect API](https://www.elsevier.com/solutions/sciencedirect)  

---

## 🛠️ Used Technologies  

### 🗃️ Database & Backend  
| Technology | Role |  
|------------|------|  
| ![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python) | Data processing, API integration, and backend logic. |  
| ![Pandas](https://img.shields.io/badge/Pandas-2.0%2B-150458?logo=pandas) | Data cleaning and transformation. |  
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql) | Scalable storage for citation networks. |  

### 🎨 Frontend & Visualization  
| Technology | Role |  
|------------|------|  
| ![D3.js](https://img.shields.io/badge/D3.js-7.8%2B-F9A03C?logo=d3.js) | Interactive graph rendering and force simulations. |  
| ![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript) | Dynamic UI and event handling. |  

---

## ⚡ Deployment  

### Quick Start with Docker  
```bash
git clone https://github.com/Data-Wrangling-and-Visualisation/CitationFlow.AI
cd CitationFlow.AI
docker-compose up --build
```
Access the app at: [http://localhost:8080](http://localhost:8080)  

---

## 🗺️ Roadmap  
| Phase | Status | Tasks |  
|-------|--------|-------|  
| **Setup & API Integration** | ✅ | Project scaffolding, ScienceDirect API exploration |  
| **Data Pipeline** | ✅ | Data extraction, cleaning, and DB schema design |  
| **Visualization** | ✅ | D3.js graph implementation |  
| **UI/UX Refinement** | 🟡 | Filtering, search, and responsive design |  
| **Optimization** | 🟠 | Performance tuning and stress testing |  

---

## 🔮 Future Enhancements  
- **Temporal Analysis**: Animate research trends over time.  
- **User Customization**: Save/export subgraphs and topic preferences.  
- **Collaboration Tools**: Shared annotations and graph bookmarks.  

---

## 🙏 Acknowledgements  
- Data provided by [ScienceDirect/Elsevier](https://www.elsevier.com/solutions/sciencedirect).  
- Built with support from **Innopolis University**.  

---

## 👥 Authors  
| Role | Name | Contact |  
|------|------|---------|  
| **Team Lead** | Marsel Berheev | m.berheeev@innopolis.university |  
| **Data Engineer** | Nikita Stepankov | n.stepankov@innopolis.university |  
| **DB Architect** | Makar Egorov | m.egorov@innopolis.university |  

---

## 📜 License  
This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.  

---

### ✨ *Unlock the hidden connections in AI research with CitationFlow.AI!*  

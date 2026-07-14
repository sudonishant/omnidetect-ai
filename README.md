<p align="center">
  <img src="screenshots/animated_banner.svg" width="100%" alt="OmniDetect AI Animated Banner" />
</p>

# 🕵️‍♂️ OmniDetect AI: Full-Stack Media Metadata Forensics & AI Detection Platform

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsudonishant%2Fomnidetect-ai&root-directory=frontend&env=VITE_BACKEND_URL" target="_blank">
    <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
  </a>
  <a href="https://render.com/deploy?repo=https://github.com/sudonishant/omnidetect-ai" target="_blank">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render"/>
  </a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT" target="_blank">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/>
  </a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-339933?style=flat&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite"/>
</p>

🔗 **Live Web Workspace: [omnidetect.vercel.app](https://omnidetect.vercel.app/)**

An advanced, full-stack cybersecurity forensics and media telemetry platform designed to extract deep metadata parameters, geo-coordinates, structure anomalies, and editing traces from uploaded files. **OmniDetect AI** provides a unified diagnostic pipeline for images, audio tracks, PDFs, and Word documents, alerting auditors to potential manipulation.

```mermaid
graph TD
    A[User Drag-n-Drop File Upload] -->|React Frontend UI| B[Vite Web Server]
    B -->|REST API & Multer| C(Express Gateway Server)
    C -->|exifr / music-metadata / pdf-parse| D[Deep Forensics Parser Engines]
    D -->|Real-time Socket.io Logs| E[Interactive Audit Dashboard]
    D -->|JSON Metadata Records| F[(SQLite Database Cache)]
```

---

## 🖥️ Platform Previews

<p align="center">
  <img src="screenshots/dashboard_view.png" width="90%" alt="Forensics Dashboard Main View" />
  <br />
  <em>Figure 1: Main Forensics Dashboard workspace containing the drag-n-drop file upload interface.</em>
</p>

<br />

<p align="center">
  <img src="screenshots/image_detector.png" width="48%" alt="AI Detection & Image Analysis" />
  <img src="screenshots/metadata_analysis.png" width="48%" alt="Deep Metadata Analysis" />
  <br />
  <em>Figure 2: AI Detection probability charts (left) and deep file metadata properties inspector (right).</em>
</p>

---

## 🚀 Key Features

*   **Multi-Modal Media Forensics**:
    *   **Images**: Extracts EXIF camera metadata, lens properties, software modifiers, and camera geolocation coordinate pins (`exifr` engine).
    *   **Audio**: Analyzes container headers, bitrate logs, codecs, and audio tag layers (`music-metadata`).
    *   **Documents**: Parses document revisions, author metadata, edit counts, and text strings from PDFs (`pdf-parse`) and Word files (`mammoth`).
*   **Real-time WebSocket Logs**: Integrated Socket.io messaging pipeline pushing scanning steps and audit progress statistics instantly to the client.
*   **Frosted Glassmorphic Dashboard**: Modern, Apple-style React dashboard UI featuring file upload dropzones, circular progress meters, and dynamic metadata property tables.
*   **Structured Local Storage**: Keeps record logs and transaction history saved in a high-performance SQLite database (`better-sqlite3`).

---

## 🛠️ Tech Stack

| Module | Core Technology | Role |
| --- | --- | --- |
| **Frontend HUD** | React / Vite | Interactive drag-and-drop audit workspace. |
| **Backend API** | Node.js / Express | Handlers for file uploads and stream pipelines. |
| **Database** | SQLite (`better-sqlite3`) | Persistent audit trails and logs records. |
| **WebSocket** | Socket.io | Real-time scan telemetry transmission. |

---

## 📥 Getting Started

### Prerequisites

*   **Node.js (>= 18.0.0)**
*   **npm**

### Quick Start Installation

We provide unified commands to install packages across the root, frontend, and backend folders automatically.

```bash
# 1. Clone the repository
git clone https://github.com/sudonishant/omnidetect-ai.git
cd omnidetect-ai

# 2. Run the automated setup tool to install all directories dependencies
npm run install:all

# 3. Spin up both backend and frontend servers concurrently in dev mode
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser to access the interactive forensics dashboard.

---

## 📁 Repository Structure

```text
omnidetect-ai/
├── package.json           # Root task orchestrator (npm run dev)
├── package-lock.json
├── .gitignore             # Ignored directories
├── README.md              # Project documentation
├── backend/               # Express API and sqlite store
│   ├── server.js          # Entrypoint server
│   ├── package.json
│   ├── config/            # DB settings
│   ├── data/              # SQLite cache database
│   └── services/          # EXIF & PDF parse utilities
└── frontend/              # React & Vite client
    ├── index.html         # Main dashboard template
    ├── vite.config.js     # Dev proxy rules
    ├── package.json
    └── src/
        ├── app.jsx        # Client rendering entry
        └── components/    # Telemetry dials and property tables
```

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⭐ Star History

We appreciate your support! If you find this platform helpful, please consider leaving a star to help others discover it.

<p align="center">
  <a href="https://star-history.com/#sudonishant/omnidetect-ai&amp;Date" target="_blank">
    <img src="https://api.star-history.com/svg?repos=sudonishant/omnidetect-ai&amp;type=Date" width="100%" alt="Star History Chart" />
  </a>
</p>

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details. Created with 💻 by [sudonishant](https://github.com/sudonishant).

# Media Understanding Platform

This is a multi-service AI-powered media understanding application that includes image and video understanding capabilities. The application leverages Google Gemini for various media analysis tasks.

## Architecture Overview

The platform consists of two main frontend services:

-   **Image Understanding**: An interactive React application for media understanding tasks with drawing, image uploads, and real-time AI analysis.
-   **Video Understanding**: A React application for video analysis, featuring AI-powered content insights and data visualization.

### Technology Stack

-   **Frontend**: React 19 with TypeScript
-   **Build Tool**: Vite
-   **State Management**: Jotai
-   **AI Integration**: Google Gemini AI (`@google/generative-ai`)
-   **Styling**: Tailwind CSS
-   **Data Visualization** (for Video Understanding): D3.js
-   **Drawing Interaction** (for Image Understanding): Perfect Freehand

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   Docker and Docker Compose

### Development Setup

#### Docker Compose (Recommended)

The easiest way to run both services simultaneously is with Docker Compose.

1.  **Create Environment File:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

2.  **Add your API Key:**
    Edit the `.env` file and add your Google Gemini API key:
    ```
    GEMINI_API_KEY=your-gemini-api-key
    ```
    You can get a key from [Google AI Studio](https://makersuite.google.com/app/apikey).

3.  **Build and Run:**
    ```bash
    docker compose up --build
    ```

The services will be available at:
-   **Image Understanding**: `http://localhost:5173`
-   **Video Understanding**: `http://localhost:9003`

#### Individual Service Development

You can also run each service independently.

**For the Image Understanding service:**

```bash
cd image-understanding
npm install
cp ../.env.example .env # Or create .env manually
# Add GEMINI_API_KEY to .env
npm run dev
```
The service will be available at `http://localhost:5173`.

**For the Video Understanding service:**

```bash
cd video-understanding
npm install
cp ../.env.example .env # Or create .env manually
# Add GEMINI_API_KEY to .env
npm run dev
```
The service will be available at `http://localhost:5174` (as per its Vite config) or as specified in its own configuration.

## Deployment

This project is configured for deployment to Google Cloud Run or GKE using Cloud Build.

-   **Kubernetes Manifests**: The `k8s-autopilot/` directory contains the necessary Kubernetes manifests for deploying the services.
-   **Cloud Build**: The `cloudbuild-autopilot.yaml` file defines the build and deployment pipeline.

To deploy the application using Cloud Build, you can run:
```bash
gcloud builds submit . --config=cloudbuild-autopilot.yaml --substitutions=_GEMINI_API_KEY=$GEMINI_API_KEY
```

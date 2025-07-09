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

### Image Handling and Data Flow

The application is designed to be secure and efficient, with a clear data flow for image processing. This design makes it suitable for both cloud-based and on-premise (closed-network) deployments.

-   **Sample Images**: The example images provided in the UI (e.g., cat, pumpkins, clock) are stored locally in the `image-understanding/public/assets/` directory. They are bundled with the application during the build process and served directly by the application's web server.

-   **User-Uploaded Images**: When a user uploads an image, it is **not** stored on any server or cloud storage. The process is as follows:
    1.  The user's browser reads the image file from their local disk.
    2.  The image is converted into a **Base64-encoded Data URL** within the browser. This is a text string representation of the image.
    3.  This Data URL is held in the browser's memory and sent as part of the API request to the application's backend every time an analysis is requested.
    4.  The backend processes the image data from the request and then discards it.

-   **Closed-Network Environment Suitability**: This in-memory, on-demand data flow is ideal for closed-network environments. When using an on-premise model like Gemma, the image data travels from the user's browser to the application backend, and then directly to the on-premise model endpoint (e.g., KubeAI) within the same network. No external cloud access is required for image data, ensuring it remains within the private environment.

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

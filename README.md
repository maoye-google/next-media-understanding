# Media Understanding Platform

This is a multi-service AI-powered media understanding application that includes image and video understanding capabilities. The application leverages Google Gemini for various media analysis tasks.

## Architecture Overview

The platform consists of two main frontend services:

-   **Image Understanding**: An interactive React application for media understanding tasks with drawing, image uploads, camera capture, and real-time AI analysis. Features intelligent camera selection for mobile devices (front/back camera detection).
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

### Camera Features (Image Understanding)

The Image Understanding service includes advanced camera functionality:

-   **Smart Camera Detection**: Automatically detects available cameras on your device
-   **Mobile Camera Selection**: On mobile devices, provides separate options for:
    -   **Browser Front Camera**: For selfies and user-facing capture
    -   **Browser Back Camera**: For environment capture with proper orientation
-   **Live Camera Switching**: Switch between cameras during active camera sessions
-   **RTSP Camera Support**: Connect to network cameras (requires proxy server for browser compatibility)
-   **Photo Capture**: Take photos with proper orientation (front camera mirrored, back camera natural)

#### Testing Camera Features

1. **Desktop Testing**: 
   - Access `http://localhost:5173`
   - Select "Browser Camera" to see available cameras
   - Multiple cameras will show individual dropdown options

2. **Mobile Testing**:
   - Access `http://localhost:5173` from your smartphone
   - Select "Browser Camera" 
   - You'll see "Browser Front Camera" and "Browser Back Camera" options
   - Test switching between cameras during active sessions
   - Take photos to verify proper orientation

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

### Alternative Development Setup

#### Using Podman (Alternative to Docker)

For local testing with Podman instead of Docker:

```bash
# Build image-understanding service
cd image-understanding
podman build -t image-understanding-local .
podman run -d --name image-understanding-test -p 5173:8080 -e GEMINI_API_KEY=${GEMINI_API_KEY} localhost/image-understanding-local:latest

# Access at http://localhost:5173
```

## Deployment

This project is configured for deployment to Google Distributed Cloud (GDC) using Cloud Build.

### Prerequisites for Deployment

-   Google Cloud Project with Cloud Build API enabled
-   GDC cluster configured and accessible via Connect Gateway
-   Gemini API key for AI functionality

### Deployment Configuration

-   **Kubernetes Manifests**: The `k8s/` directory contains Kubernetes manifests for GDC deployment
-   **Cloud Build**: The `cloudbuild.yaml` file defines the complete build and deployment pipeline
-   **Target Environment**: Google Distributed Cloud (GDC) cluster

### Deploy to GCP

To deploy the application to your GDC cluster:

```bash
# Deploy with Cloud Build
gcloud builds submit --config cloudbuild.yaml --substitutions _GEMINI_API_KEY="your-gemini-api-key" .
```

### Deployment Features

The deployment includes:
-   **Automated Building**: Builds both image-understanding and video-understanding services
-   **Security Scanning**: Vulnerability scanning with critical issue blocking
-   **GDC Integration**: Deploys to on-premises GDC cluster via Connect Gateway  
-   **TLS Certificates**: Auto-generated self-signed certificates for HTTPS
-   **Load Balancing**: LoadBalancer services for external access
-   **Health Checks**: Kubernetes deployment readiness and liveness checks

### Access Deployed Application

After successful deployment, the services will be available at:
-   **Image Understanding**: `https://<external-ip>:443` 
-   **Video Understanding**: `https://<external-ip>:443`

Check service endpoints with:
```bash
kubectl get svc -n media-understanding
```

For local access via port forwarding:
```bash
kubectl port-forward svc/image-understanding-svc 8080:443 -n media-understanding
kubectl port-forward svc/video-understanding-svc 8081:443 -n media-understanding
```

### Troubleshooting Deployment

If deployment fails:
1. Check Cloud Build logs in the Google Cloud Console
2. Verify GDC cluster connectivity: `kubectl get nodes`
3. Check pod status: `kubectl get pods -n media-understanding`
4. View pod logs: `kubectl logs -l app=image-understanding -n media-understanding`

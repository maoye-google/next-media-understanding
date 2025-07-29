# GDC Cluster Deployment Guide

This guide documents the required configurations and fixes to successfully deploy applications to Google Distributed Cloud (GDC) clusters using Cloud Build.

## Prerequisites

- GDC cluster registered with Fleet (Connect Gateway enabled)
- Cloud Build configured with appropriate service accounts
- Container images stored in Google Container Registry (GCR) or Artifact Registry

## Required IAM Permissions

### Cloud Build Service Account Permissions

The Cloud Build service account (typically `PROJECT_NUMBER-compute@developer.gserviceaccount.com`) needs these IAM roles:

```bash
# Core IAM management permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

# GKE Hub permissions for GDC cluster access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/gkehub.viewer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/gkehub.gatewayReader"

# Container Registry access for image pulling
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Application Service Account Permissions

For applications using Vertex AI or other Google Cloud services:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectViewer"
```

## Kubernetes RBAC Configuration

The Cloud Build service account needs cluster-level permissions on the GDC cluster:

```bash
# Connect to your GDC cluster
gcloud container hub memberships get-credentials GDC_CLUSTER_NAME --project PROJECT_ID

# Grant cluster-admin permissions (simplest approach)
kubectl create clusterrolebinding cloudbuild-admin-binding \
  --clusterrole=cluster-admin \
  --user=PROJECT_NUMBER-compute@developer.gserviceaccount.com

# Alternative: More restrictive permissions (recommended for production)
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cloudbuild-deployer
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["extensions", "networking.k8s.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cloudbuild-deployer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cloudbuild-deployer
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: PROJECT_NUMBER-compute@developer.gserviceaccount.com
EOF
```

## Container Image Access Configuration

GDC clusters require proper authentication to pull images from GCR/Artifact Registry.

### 1. Create Image Pull Secret

```bash
# Using the Cloud Build service account (recommended for GDC)
kubectl create secret docker-registry gcr-json-key \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(gcloud iam service-accounts keys create /dev/stdout --iam-account=PROJECT_NUMBER-compute@developer.gserviceaccount.com)" \
  --docker-email=PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --namespace=YOUR_NAMESPACE
```

### 2. Configure Deployments to Use Image Pull Secret

Update your Kubernetes deployments to reference the image pull secret:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      imagePullSecrets:
      - name: gcr-json-key
      containers:
      - name: your-container
        image: gcr.io/PROJECT_ID/your-image:tag
```

Or patch existing deployments:

```bash
kubectl patch deployment YOUR_DEPLOYMENT -n YOUR_NAMESPACE -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"gcr-json-key"}]}}}}'
```

## Cloud Build Configuration

### Service Account References

Ensure your `cloudbuild.yaml` uses correct service account emails:

```yaml
substitutions:
  _CLOUDBUILD_SA: "PROJECT_NUMBER-compute@developer.gserviceaccount.com"
  _VERTEX_SA_EMAIL: "your-vertex-ai-sa@PROJECT_ID.iam.gserviceaccount.com"
  _GDC_CLUSTER_NAME: 'your-gdc-cluster-name'
```

### GDC Cluster Connection

```yaml
# Get GDC cluster credentials via Connect Gateway
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'container'
    - 'hub'
    - 'memberships'
    - 'get-credentials'
    - '$_GDC_CLUSTER_NAME'
    - '--project=$PROJECT_ID'
  id: 'get-credentials'
```

### YAML Processing for Multi-Resource Files

When extracting specific resources from YAML files containing multiple resources:

```yaml
# Extract service definition (before "---" separator)
- name: 'gcr.io/cloud-builders/kubectl'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      set -ex
      echo "--- Applying service ONLY ---"
      sed -n '1,/^---/p' k8s/your-file.yaml | sed '$d' > /workspace/service.yaml
      cat /workspace/service.yaml
      kubectl apply -f /workspace/service.yaml --namespace=YOUR_NAMESPACE
  id: 'deploy-service'
```

## Health Check Configuration

Ensure your Kubernetes health checks use valid API endpoints:

### Common Issue: 404 on Health Endpoints

If your application doesn't have a `/health` endpoint, update the deployment to use an existing endpoint:

```bash
# Update liveness and readiness probes
kubectl patch deployment YOUR_APP -n YOUR_NAMESPACE -p '{"spec":{"template":{"spec":{"containers":[{"name":"YOUR_CONTAINER","livenessProbe":{"httpGet":{"path":"/api/status","port":8000}},"readinessProbe":{"httpGet":{"path":"/api/status","port":8000}}}]}}}}'
```

Or in your deployment YAML:

```yaml
livenessProbe:
  httpGet:
    path: /api/your-valid-endpoint
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /api/your-valid-endpoint
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Testing Connectivity

Deploy a debug pod to test services from within the cluster:

```bash
# Create test pod
kubectl run debug-test --image=curlimages/curl --restart=Never --namespace=YOUR_NAMESPACE -- /bin/sh -c "
echo 'Testing frontend service...'
curl -s -o /dev/null -w 'Frontend HTTP: %{http_code}\n' http://your-frontend-service/
echo 'Testing backend service...'
curl -s -o /dev/null -w 'Backend HTTP: %{http_code}\n' http://your-backend-service:8000/api/status
echo 'Tests completed'
"

# Check results
kubectl logs debug-test -n YOUR_NAMESPACE

# Clean up
kubectl delete pod debug-test -n YOUR_NAMESPACE
```

## Common Troubleshooting

### ImagePullBackOff Errors

1. **Check image pull secret exists**: `kubectl get secret gcr-json-key -n YOUR_NAMESPACE`
2. **Verify service account has storage.objectViewer role**
3. **Ensure deployment references imagePullSecrets**
4. **Test image access manually**:
   ```bash
   gcloud container images list-tags gcr.io/PROJECT_ID/IMAGE_NAME --limit=5
   ```

### Permission Denied Errors

1. **Verify IAM roles are applied**: `gcloud projects get-iam-policy PROJECT_ID`
2. **Check Kubernetes RBAC**: `kubectl get clusterrolebinding cloudbuild-admin-binding`
3. **Ensure service account keys are valid and not expired**

### Pod Health Check Failures

1. **Check if health endpoint exists**: Review application code
2. **Test endpoint manually**: Use debug pod to curl the endpoint
3. **Update probe configuration**: Use valid API endpoints
4. **Check application logs**: `kubectl logs POD_NAME -n YOUR_NAMESPACE`

## Complete Example Cloud Build Step

```yaml
# Deploy to GDC cluster with all required configurations
- name: 'gcr.io/cloud-builders/kubectl'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      set -ex
      
      # Create image pull secret
      kubectl create secret docker-registry gcr-json-key \
        --docker-server=gcr.io \
        --docker-username=_json_key \
        --docker-password="$(cat /workspace/service-account-key.json)" \
        --docker-email=$_CLOUDBUILD_SA \
        --namespace=YOUR_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
      
      # Apply deployment with image pull secret
      sed -e "s/\${PROJECT_ID}/$PROJECT_ID/g" \
          -e "s/\${BUILD_ID}/$BUILD_ID/g" \
          k8s/deployment.yaml > /workspace/deployment.yaml
      kubectl apply -f /workspace/deployment.yaml --namespace=YOUR_NAMESPACE
      
      # Wait for deployment to be ready
      kubectl rollout status deployment/YOUR_APP --namespace=YOUR_NAMESPACE --timeout=300s
  id: 'deploy-to-gdc'
  waitFor: ['get-credentials', 'push-images']
```

## Security Considerations

1. **Use least privilege IAM roles** when possible
2. **Regularly rotate service account keys**
3. **Use Workload Identity** where supported
4. **Limit cluster RBAC permissions** to specific namespaces when possible
5. **Monitor service account usage** and access patterns

This guide provides the essential configurations needed to deploy applications to GDC clusters successfully. Adapt the specific values (project IDs, cluster names, service account emails) to match your environment.
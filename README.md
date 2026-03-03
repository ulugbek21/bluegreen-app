## Blue-Green Node App

Simple Node.js HTTP server used to demonstrate blue-green deployments on Kubernetes, with a Docker image and GitHub Actions workflow for automated builds.

The app exposes a single endpoint that responds with the current version identifier, driven by the `VERSION` environment variable.

```bash
Running version: BLUE
```

or

```bash
Running version: GREEN
```

### Project Structure

- **server.js**: Minimal HTTP server that reads `PORT` and `VERSION` from the environment.
- **package.json**: Node.js metadata and `start` script.
- **Dockerfile**: Production-ready image definition based on `node:20-alpine`.
- **k8s/blue-deployment.yaml**: Kubernetes `Deployment` for the blue version (`app: blue`, `VERSION=BLUE`).
- **k8s/green-deployment.yaml**: Kubernetes `Deployment` for the green version (`app: green`, `VERSION=GREEN`).
- **k8s/service.yaml**: Kubernetes `Service` exposing the currently active color (`app-service`).
- **.github/workflows/deploy.yml**: GitHub Actions workflow to build and push images, and (optionally) deploy.

### Prerequisites

- Node.js 20+ and npm (for local development), or Docker (for containerized runs).
- (Optional) A Kubernetes cluster and `kubectl` configured.
- (Optional) Docker Hub account and credentials (used by the provided workflow).

### Running Locally (Node)

Install dependencies and start the server:

```bash
npm install
VERSION=LOCAL npm start
```

The server listens on `PORT` (default `3000`) and responds with the current `VERSION`:

```bash
curl http://localhost:3000
```

Expected output:

```text
Running version: LOCAL
```

### Running with Docker

Build the image:

```bash
docker build -t bluegreen-app:local .
```

Run the container (overriding `VERSION` if desired):

```bash
docker run --rm -p 3000:3000 -e VERSION=LOCAL bluegreen-app:local
```

Then call:

```bash
curl http://localhost:3000
```

### Kubernetes Blue-Green Deployments

This repository uses two separate `Deployment` resources, one for each color:

- `k8s/blue-deployment.yaml` → `app-blue` deployment with label `app: blue` and `VERSION=BLUE`.
- `k8s/green-deployment.yaml` → `app-green` deployment with label `app: green` and `VERSION=GREEN`.

The `k8s/service.yaml` file defines a `Service` named `app-service`:

- Type: `NodePort`
- Port: `80`
- Target port: `3000`
- Selector: `app: blue` (by default)

#### Initial Setup

Apply deployments and service:

```bash
kubectl apply -f k8s/blue-deployment.yaml
kubectl apply -f k8s/green-deployment.yaml
kubectl apply -f k8s/service.yaml
```

By default, traffic goes to the blue version because the service selector is `app: blue`.

#### Switching Traffic Between Blue and Green

To switch traffic to the green deployment:

```bash
kubectl patch service app-service \
  -p '{"spec":{"selector":{"app":"green"}}}'
```

To switch back to blue:

```bash
kubectl patch service app-service \
  -p '{"spec":{"selector":{"app":"blue"}}}'
```

This change is instantaneous from the client’s perspective and allows for zero-downtime cutovers if both versions are healthy.

### GitHub Actions Workflow

The workflow in `.github/workflows/deploy.yml`:

- Triggers on pushes to the `main` branch.
- Logs in to Docker Hub using `DOCKER_USER` and `DOCKER_PASSWORD` secrets.
- Chooses a color (`blue` or `green`) based on the GitHub run number.
- Builds and pushes an image tagged with the selected color:
  - Registry: `docker.io/jeyran`
  - Image name: `bluegreen-app`
  - Tag: `blue` or `green`

The deploy step is currently commented out to avoid accidental deployments:

```yaml
# - name: Deploy 
#   run: |
#     kubectl apply -f k8s/${{ steps.color.outputs.COLOR }}-deployment.yaml
#     kubectl patch service app-service \
#       -p '{"spec":{"selector":{"app":"${{ steps.color.outputs.COLOR }}"}}}'
```

To enable automated blue-green cutovers from GitHub Actions, uncomment this block (and ensure your runner has access to the target cluster).

### Configuration

- **Environment variables**
  - `PORT`: Port the app listens on (default `3000`).
  - `VERSION`: Arbitrary version/identifier string returned by the app.
- **Kubernetes**
  - Edit `k8s/*-deployment.yaml` to change image names, tags, replica counts, or environment variables.
  - Edit `k8s/service.yaml` to change exposure type, ports, or default selector.

### Cleaning Up

To remove all resources from your cluster:

```bash
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/blue-deployment.yaml
kubectl delete -f k8s/green-deployment.yaml
```


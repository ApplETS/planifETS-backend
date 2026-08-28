# Deployment

The application is deployed with two repositories:

- This repository builds and publishes the backend image through [the CD workflow](../.github/workflows/cd.yml).
- [`k8s-shared`](https://github.com/ClubCedille/k8s-shared/tree/main/apps/clubs/applets/) is the GitOps source used by ArgoCD. `planifets` contains the frontend, backend and CloudNativePG resources; `planifets-chatbot` contains Qdrant.

| Environment | URL | Namespace | Backend image tag | GitOps overlays |
| --- | --- | --- | --- | --- |
| Development | <https://planifets.dev.cedille.club/> | `planifets-dev` | `dev` | `planifets/dev`, `planifets-chatbot/dev` |
| Staging | <https://planifets.staging.cedille.club/> | `planifets-staging` | `staging` | `planifets/staging`, `planifets-chatbot/staging` |
| Production | <https://planifets.clubapplets.ca/> | `planifets` | `latest` | `planifets/prod`, `planifets-chatbot/prod` |

## Build and deploy

1. Validate the backend build:

   ```bash
   yarn install --frozen-lockfile
   yarn build
   docker build --target production \
     --build-arg APP_GIT_SHORT_SHA="$(git rev-parse --short=7 HEAD)" \
     -t planifets-backend:local .
   ```

2. Merge the tested commit into `main`. The `CD` workflow builds it once and publishes an immutable `main-<sha>` tag.
3. Run the `CD` workflow with `workflow_dispatch`, select `dev`, `staging` or `prod`, and enter that immutable tag as `source_tag`. The workflow retags the existing manifest without rebuilding it, so every environment receives the exact same image digest.
4. ArgoCD Image Updater detects the environment tag and updates the workload digest. ArgoCD then synchronizes the corresponding overlays. Do not deploy by editing a running Deployment: ArgoCD self-healing will revert that change.
5. Follow the rollout and perform the health checks below. Promote the same `source_tag` from dev to staging and then production by rerunning the workflow for each environment.

The GitHub repository must allow the workflow to write packages to GHCR. Deployment manifests, environment URLs, resource sizing and probes must be changed in the GitOps repository, not in this application repository.

## Secret management

Runtime secrets are stored in HashiCorp Vault and synchronized to Kubernetes by the `VaultSecret` operator. Only Vault references and templates belong in Git; never commit secret values, local `.env` files, decoded Kubernetes Secrets or credentials in deployment documentation.

| Environment | Application secrets | Qdrant secret |
| --- | --- | --- |
| Development | `kv/data/planifets-dev/default/{frontend,backend,cnpg}` | `kv/data/planifets-dev/default/chatbot/qdrant` |
| Staging | `kv/data/planifets-staging/default/planifets-staging/{frontend,backend,cnpg}` | `kv/data/planifets-staging/default/chatbot/qdrant` |
| Production | `kv/data/planifets/default/planifets/{planifets-frontend,planifets-backend}` | `kv/data/planifets/default/chatbot/qdrant` |

The Qdrant path supplies `api_key`; the operator writes it as `qdrant_api_key` in the Kubernetes Secret `planifets-chatbot-secret`. The backend and Qdrant must use the same value. Application secrets are materialized as `planifets-secret`, `planifets-frontend-secret` and, where applicable, `cnpg-secret`.

To create, change or rotate a secret:

1. Use the authenticated Vault UI or CLI and the path for the target environment. Do not put a secret value on a shared command line, in a shell history or in a ticket.
2. Keep access environment-specific and grant only the minimum Vault and Kubernetes RBAC permissions needed.
3. Wait for the `VaultSecret` refresh (configured for one hour), or ask a cluster administrator to reconcile it.
4. Confirm only that the expected Secret and key names exist; do not print or decode their values.
5. Restart the affected workload through the GitOps/ArgoCD procedure if the application does not reload the rotated value, then repeat the health checks.

## Deployment verification

Set the namespace and public URL to the row for the environment being checked, then verify all four components:

```bash
kubectl get deployments,statefulsets,pods,pvc -n "$NAMESPACE"
kubectl get cluster.postgresql.cnpg.io -n "$NAMESPACE"
kubectl rollout status deployment/planifets -n "$NAMESPACE"
kubectl rollout status deployment/planifets-backend -n "$NAMESPACE"
kubectl rollout status statefulset/planifets-chatbot-qdrant -n "$NAMESPACE"
kubectl get secret planifets-secret planifets-chatbot-secret -n "$NAMESPACE"

curl --fail --show-error "$BASE_URL/"
curl --fail --show-error "$BASE_URL/api/health/live"
curl --fail --show-error "$BASE_URL/api/health/ready"
curl --fail --show-error "$BASE_URL/api/health"
```

The environment is healthy only when:

- the frontend and backend Deployments have every desired replica available;
- the Qdrant StatefulSet is Ready and its PVC is Bound;
- the CloudNativePG cluster reports `Cluster in healthy state` and its PVC is Bound;
- the frontend, liveness and readiness requests return HTTP 2xx; and
- `/api/health` reports the frontend, PostgreSQL and Qdrant dependencies as available.

If the backend is in `CreateContainerConfigError`, inspect pod events with `kubectl describe pod`. A missing `planifets-chatbot-secret` usually means the Qdrant ArgoCD Application or its Vault path has not been reconciled in that namespace. Do not copy a Secret from another environment.

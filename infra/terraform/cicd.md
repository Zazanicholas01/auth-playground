### Install Flux

Install Flux CLI on the host:
```bash
curl -s https://fluxcd.io/install.sh | sudo bash
flux --version
```

Install Flux controllers:
```bash
flux install
flux check
```

---

**Create the Git SSH secret for image automation:**
```bash
flux create secret git playground-manifests \
  --url=ssh://git@github.com/Zazanicholas01/auth-playground.git \
  --namespace=flux-system \
  --export > /tmp/playground-manifests-secret.yaml
```
Find the public key by reading the /tmp file:
```bash
cat /tmp/playground-manifests-secret.yaml
```
Add the public key as a `deploy key` in `Zazanicholas01/auth-playground` on GitHub.

Give it write access for image automation to work later on.
After the deploy key is added, apply the secret:
```bash
kubectl apply -f /tmp/playground-manifests-secret.yaml
```

---

**Apply flux-system manifests**

```bash
export KUBECONFIG=/home/nicholas/Desktop/dtw-greenhouse/auth-playground/infra/terraform/k3s.yaml
kubectl config current-context
```
Then apply them:
```bash
kubectl apply -k ./flux-system
```

**Start reconciling**

Reconcile Git source:
```bash
flux reconcile source git playground-manifests -n flux-system
```

For live debugging of the reconciliation:
```bash
flux logs -n flux-system --kind=Kustomization --name=infrastructure --follow
```

---

**Install missing CRDs**

Gateway Nginx API:
```bash
kubectl kustomize "https://github.com/nginx/nginx-gateway-fabric/config/crd/gateway-api/standard?ref=v2.5.1" | kubectl apply -f -
```

Install:
```bash
helm install ngf oci://ghcr.io/nginx/charts/nginx-gateway-fabric \
  --create-namespace \
  -n nginx-gateway \
  --kubeconfig ./infra/terraform/k3s.yaml
```

Cert Manager CRDs:
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
```

Install:
```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.18.0 \
  --set crds.enabled=true \
  --kubeconfig ./infra/terraform/k3s.yaml
```

Trust Manager:
```bash
helm upgrade trust-manager oci://quay.io/jetstack/charts/trust-manager \
  --install \
  --namespace cert-manager \
  --wait \
  --kubeconfig ./infra/terraform/k3s.yaml
```

Just a little problem with these manifests that expect Keycloak's namespace to be already created:
```bash
kubectl create ns keycloak
```

Then reconcile the `infrastructure` Kustomization:
```bash
flux reconcile kustomization infrastructure -n flux-system --with-source
flux get kustomizations -n flux-system
```

## Active app reconciliation

Missing CRDs:

EMQX CRDs:
```bash
helm repo add emqx https://repos.emqx.io/charts
helm repo update
```

Install:
```bash
helm upgrade --install emqx-operator emqx/emqx-operator \
  --namespace emqx-operator-system \
  --create-namespace \
  --kubeconfig ./infra/terraform/k3s.yaml
```

Keycloak CRDs:
```bash
kubectl apply -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.6.1/kubernetes/keycloaks.k8s.keycloak.org-v1.yml

kubectl apply -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.6.1/kubernetes/keycloakrealmimports.k8s.keycloak.org-v1.yml
```

Install the operator:
```bash
kubectl -n keycloak apply -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.6.1/kubernetes/kubernetes.yml
```
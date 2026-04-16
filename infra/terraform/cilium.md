### Install Helm

```bash
sudo apt-get install curl gpg apt-transport-https --yes
curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm -y
helm version
```

Add the Cilium chart repo:
```bash
helm repo add cilium https://helm.cilium.io/
helm repo update
helm search repo cilium/cilium --versions | head
```

Install Cilium through Helm:
```bash
helm install cilium cilium/cilium \
  --kubeconfig ./k3s.yaml \
  --version 1.19.3 \
  --namespace kube-system \
  --set operator.replicas=1
```
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

To enable L2 announcement and load balancer functionalities through Cilium:

```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: libvirt-lb-pool
spec:
  allowFirstLastIPs: No
  blocks:
    - start: 192.168.122.240
      stop: 192.168.122.250
```
And apply:
```bash
kubectl apply -f cilium-lb-pool.yaml
kubectl get ippools
```

Then also L2 Announcement Policy:
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: libvirt-lb-pool
spec:
  allowFirstLastIPs: No
  blocks:
    - start: 192.168.122.240
      stop: 192.168.122.250
```
And apply:
```bash
kubectl apply -f cilium-l2-policy.yaml
kubectl get ciliuml2announcementpolicies
```

Then update the Helm chart:
```bash
helm upgrade cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --reuse-values \
  --set l2announcements.enabled=true \
  --set k8sClientRateLimit.qps=20 \
  --set k8sClientRateLimit.burst=40 \
  --set kubeProxyReplacement=true \
  --kubeconfig ./infra/terraform/k3s.yaml
```

IMPORTANT

Restart the Daemon Set of Cilium for it to pick up new config:
```bash
kubectl rollout restart ds/cilium -n kube-system
```

Then check the service:
```bash
kubectl get svc -A
```
You should see an `External IP` on the Nginx Gateway.

Test:
```bash
curl -vk https://<External IP>/
curl -v http://<External IP>/
```

**Add hosts resolution**

Then as last step, add routes to hosts file:
```bash
sudo sh -c 'cat >> /etc/hosts <<EOF
192.168.122.240 jwtlab.local
192.168.122.240 keycloak.demo.local
192.168.122.240 oidclab.local
192.168.122.240 emqx.local
192.168.122.240 iot.local
EOF'
```
Then test from the host:
```bash
curl -vk https://jwtlab.local
curl -vk https://keycloak.demo.local
curl -vk https://oidclab.local
curl -vk https://emqx.local
curl -vk https://iot.local
```
After that, open from the browser:

- `https://jwtlab.local`
- `https://keycloak.demo.local`
- `https://oidclab.local`
- `https://emqx.local`
- `https://iot.local`

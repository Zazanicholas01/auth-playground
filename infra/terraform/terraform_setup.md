### Virtualization / VM commands

List all VMs:
```bash
virsh -c qemu:///system list --all
```

Start a VM:
```bash
virsh -c qemu:///system start k3s-single
```

Get the machine's IP:
```bash
virsh -c qemu:///system domifaddr k3s-single
```

SSH into the machine:
```bash
ssh ubuntu@<new_ip>
```

### Network behavior

The VM now uses a static guest address from cloud-init, matched by the MAC declared in Terraform. No manual `virsh net-edit` DHCP reservation is required.

Choose any free IP in:
- `192.168.122.2 - 254`

If you need to change the address later, update these Terraform variables and apply again:
- `vm_mac`
- `vm_ip`
- `vm_prefix_length`
- `vm_gateway`
- `vm_dns_servers`

Restart the VM if you change networking:
```bash
virsh -c qemu:///system reboot k3s-single
```

Verify the address:
```bash
virsh -c qemu:///system domifaddr k3s-single
```

### Kubeconfig commands

If IP changed, the `kubeconfig` still points to the old IP, so edit `k3s.yaml`.

From:
```yaml
server: https://<OLD_IP>:6443
```
To:
```yaml
server: https://<NEW_IP>:6443
```

### SSH commands

If ssh key not trusted after recreating a VM:
```bash
ssh-keygen -f ~/.ssh/known_hosts -R 192.168.122.58
```

### Certificate problem after recreating VM & reinstalling K3S

- The live API server certificate included `192.168.122.58` so was not a SAN mismatch.
- The local `k3s.yaml` was stale from an older cluster instance, so `kubectl` was pointing to a wrong CA.
- Refreshed the `kubeconfig` from the VM and rewrote the `server` endpoint to `https://192.168.122.58:6443`.

Copy new kubeconfig from the VM:
```bash
scp ubuntu@192.168.122.58:/etc/rancher/k3s/k3s.yaml ./k3s.yaml
```

Replace the server to use the actual VM's IP:
```bash
sed -i 's|https://127.0.0.1:6443|https://192.168.122.58:6443|g' ./k3s.yaml
```

Export kubeconfig as env variable:
```bash
KUBECONFIG=./k3s.yaml kubectl get nodes -o wide
```
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

### DHCP commands

Get VM MAC address:
```bash
virsh -c qemu:///system domiflist k3s-single
```

Edit libvirt network:

```bash
virsh -c qemu:///system net-edit default
```
Find `<dhcp> section and add:
```xml
<host mac='52:54:00:ab:cd:ef' name='k3s-single' ip='192.168.122.100'/>
```
Choose any free IP in:
- `192.168.122.2 - 254`

Restart the network:
```bash
virsh -c qemu:///system net-destroy default
virsh -c qemu:///system net-start default
```

Reboot the VM:
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


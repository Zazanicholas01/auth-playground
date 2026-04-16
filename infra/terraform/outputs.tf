output "vm_name" {
  value = libvirt_domain.vm.name
}

output "vm_ip_observed" {
  value = try(libvirt_domain.vm.network_interface[0].addresses[0], null)
}

output "vm_ip" {
  value = try(libvirt_domain.vm.network_interface[0].addresses[0], var.vm_ip)
}

output "vm_mac" {
  value = var.vm_mac
}

output "ssh_command" {
  value = "ssh ubuntu@${try(libvirt_domain.vm.network_interface[0].addresses[0], var.vm_ip)}"
}

output "kubeconfig_copy_command" {
  value = "scp ubuntu@${try(libvirt_domain.vm.network_interface[0].addresses[0], var.vm_ip)}:/etc/rancher/k3s/k3s.yaml ./k3s.yaml"
}

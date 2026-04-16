terraform {
  required_version = ">= 1.5.0"

  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.8.3"
    }
  }
}

provider "libvirt" {
  uri = "qemu:///system"
}

resource "libvirt_volume" "ubuntu_base" {
  name   = "ubuntu_base.qcow2"
  pool   = var.pool_name
  source = var.ubuntu_image_path
  format = "qcow2"
}

resource "libvirt_volume" "vm_disk" {
  name           = "${var.vm_name}.qcow2"
  pool           = var.pool_name
  base_volume_id = libvirt_volume.ubuntu_base.id
  size           = var.disk_size_bytes
  format         = "qcow2"
}

resource "libvirt_cloudinit_disk" "commoninit" {
  name = "${var.vm_name}-cloudinit.iso"
  pool = var.pool_name
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    hostname       = var.vm_name,
    ssh_public_key = file(var.ssh_public_key_path)
    k3s_channel    = var.k3s_channel
    vm_ip          = var.vm_ip
  })
  network_config = templatefile("${path.module}/network-config.yaml.tftpl", {
    vm_mac           = lower(var.vm_mac)
    vm_ip            = var.vm_ip
    vm_prefix_length = var.vm_prefix_length
    vm_gateway       = var.vm_gateway
    vm_dns_servers   = var.vm_dns_servers
  })
}

resource "libvirt_domain" "vm" {
  name   = var.vm_name
  memory = var.memory_mb
  vcpu   = var.vcpu

  cloudinit = libvirt_cloudinit_disk.commoninit.id

  cpu {
    mode = "host-passthrough"
  }

  qemu_agent = true

  network_interface {
    network_name = var.network_name
    hostname     = var.vm_name
    mac          = var.vm_mac
  }

  disk {
    volume_id = libvirt_volume.vm_disk.id
  }

  console {
    type        = "pty"
    target_type = "serial"
    target_port = "0"
  }

  graphics {
    type        = "spice"
    listen_type = "address"
    autoport    = true
  }
}

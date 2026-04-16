variable "vm_name" {
    type = string
    default = "k3s-single"
}

variable "pool_name" {
    type = string
    default = "default"
}

variable "network_name" {
    type = string
    default = "default"
}

variable "ubuntu_image_path" {
    type = string
    description = "Absolute path to Ubuntu cloud image qcow2"
}

variable "ssh_public_key_path" {
    type = string
    description = "Absolute path to SSH public key file"
}

variable "vcpu" {
    type = number
    default = 6
}

variable "memory_mb" {
    type = number
    default = 12288 # 12 GB
}

variable "disk_size_bytes" {
    type = number
    default = 128 * 1024 * 1024 * 1024 # 128 GB
}

variable "k3s_channel" {
    type = string
    default = "stable"
}
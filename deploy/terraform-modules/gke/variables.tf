variable "project_id" {
    type = string
}

variable "region" {
    type = string
}

variable "zone" {
    type = string
}

variable "cluster_name" {
    type = string
}

variable "machine_type" {
    type = string
}

variable "preemptible" {
    type = bool
    default = false
}

variable "initial_node_count" {
    type = number
    default = 1
}

variable "min_node_count" {
    type = number
}

variable "max_node_count" {
    type = number
}

# uncomment for cloudflare
# variable "cloudflare_api_token" {
#     type = string
# }

variable "letsencrypt_email_address" {
    type = string
}

variable "instancer_zone" {
    type = string
}

variable "instancer_subdomain" {
    type = string
}

variable "ctf_name" {
    type = string
}

variable "gcp_dns_managed_zone_name" {
    type    = string
    default = ""
}

# GCP-specific configuration:
variable "gcp_project_id" {
    type = string
    default = ""
}

variable "gcp_region" {
    type = string
    default = ""
}

variable "gcp_zone" {
    type = string
    default = ""
}

variable "gcp_instancer_cluster_name" {
    type = string
    default = ""
}

variable "gcp_instancer_machine_type" {
    type = string
    default = ""
}

variable "gcp_instancer_min_node_count" {
    type = string
    default = 1
}

variable "gcp_instancer_max_node_count" {
    type = string
    default = 1
}

# Cloudflare:
# provider "cloudflare" {
#     api_token = var.cloudflare_api_token
# }
#
# data "cloudflare_zone" "zone" {
#     name = var.instancer_zone
# }
#
# resource "cloudflare_record" "instancer" {
#     zone_id = data.cloudflare_zone.zone.zone_id
#     name = "*.${var.instancer_subdomain}"
#     content = module.rctf-k8s.traefik_external_ip
#     type = "A"
#     ttl = 300
#     proxied = false
# }

# GCP Cloud DNS:
data "google_dns_managed_zone" "zone" {
    name    = var.gcp_dns_managed_zone_name
    project = var.gcp_project_id
}

resource "google_dns_record_set" "instancer" {
    managed_zone = data.google_dns_managed_zone.zone.name
    name         = "*.${var.instancer_subdomain}.${var.instancer_zone}."
    type         = "A"
    ttl          = 300
    rrdatas      = [module.rctf-k8s.traefik_external_ip]
    project      = var.gcp_project_id
}

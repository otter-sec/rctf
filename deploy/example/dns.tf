provider "cloudflare" {
    api_token = var.cloudflare_api_token
}

data "cloudflare_zone" "zone" {
    name = var.instancer_zone
}

resource "cloudflare_record" "instancer" {
    zone_id = data.cloudflare_zone.zone.zone_id
    name = "*.${var.instancer_subdomain}"
    content = module.rctf-k8s.traefik_external_ip
    type = "A"
    ttl = 300
    proxied = false
}

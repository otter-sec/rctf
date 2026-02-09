# We provision the TLS certificate manually instead of using something like cert-manager
# to avoid storing the DNS provider secrets in the instancer cluster to limit the blast radius.
# Wildcard certificates can only be provisioned over DNS-01 :(

resource "tls_private_key" "private_key" {
    algorithm = "RSA"
}

resource "acme_registration" "reg" {
    account_key_pem = tls_private_key.private_key.private_key_pem
    email_address = var.letsencrypt_email_address
}

resource "acme_certificate" "certificate" {
    account_key_pem = acme_registration.reg.account_key_pem
    common_name = "${var.instancer_subdomain}.${var.instancer_zone}"
    subject_alternative_names = ["*.${var.instancer_subdomain}.${var.instancer_zone}"]

    dns_challenge {
        provider = "cloudflare"
        config = {
            CF_DNS_API_TOKEN = var.cloudflare_api_token
        }
    }
}

resource "kubernetes_secret_v1" "instancer_wildcard_tls" {
    metadata {
        name = "instancer-wildcard-tls"
        namespace = "traefik"
    }

    type = "kubernetes.io/tls"
    data = {
        "tls.crt" = "${acme_certificate.certificate.certificate_pem}${acme_certificate.certificate.issuer_pem}"
        "tls.key" = resource.acme_certificate.certificate.private_key_pem
    }

    depends_on = [module.rctf-k8s]
}

resource "kubernetes_manifest" "tlsstore" {
    manifest = {
        apiVersion = "traefik.io/v1alpha1"
        kind = "TLSStore"
        metadata = {
            name      = "default"
            namespace = "traefik"
        }
        spec = {
            certificates = [
                {
                    secretName = kubernetes_secret_v1.instancer_wildcard_tls.metadata[0].name
                }
            ]
            defaultCertificate = {
                secretName = kubernetes_secret_v1.instancer_wildcard_tls.metadata[0].name
            }
        }
    }

    depends_on = [module.rctf-k8s]
}
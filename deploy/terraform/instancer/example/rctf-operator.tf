module "rctf-k8s" {
    source = "../modules/k8s"

    ctf_name = var.ctf_name
    instancer_host = var.instancer_subdomain != "" ? "${var.instancer_subdomain}.${var.instancer_zone}" : var.instancer_zone
}

output "traefik_ip" {
    value = module.rctf-k8s.traefik_external_ip
}

resource "kubernetes_service_account_v1" "rctf" {
    metadata {
        name = "rctf"
        namespace = "kube-system"
    }
}

resource "kubernetes_cluster_role_v1" "rctf" {
    metadata {
        name = "rctf"
    }

    rule {
        api_groups = ["rctf.osec.io"]
        resources = ["challengeinstances"]
        verbs = ["create", "get", "delete", "patch"]
    }
}

resource "kubernetes_cluster_role_binding_v1" "rctf" {
    metadata {
        name = "rctf"
    }

    role_ref {
        api_group = "rbac.authorization.k8s.io"
        kind = "ClusterRole"
        name = kubernetes_cluster_role_v1.rctf.metadata[0].name
    }

    subject {
        kind = "ServiceAccount"
        name = kubernetes_service_account_v1.rctf.metadata[0].name
        namespace = kubernetes_service_account_v1.rctf.metadata[0].namespace
    }
}

resource "kubernetes_secret_v1" "rctf_token" {
    metadata {
        name = "rctf-token"
        namespace = kubernetes_service_account_v1.rctf.metadata[0].namespace
        annotations = {
            "kubernetes.io/service-account.name" = kubernetes_service_account_v1.rctf.metadata[0].name
        }
    }

    type = "kubernetes.io/service-account-token"
}

output "rctf_instancer_api_url" {
    value = "https://${module.gke.endpoint}"
}

output "rctf_instancer_ca_certificate" {
    value = module.gke.cluster_ca_certificate
    sensitive = true # not really sensitive but very ugly to print out to stdout each time
}

output "rctf_instancer_auth_token" {
    value = kubernetes_secret_v1.rctf_token.data["token"]
    sensitive = true
}

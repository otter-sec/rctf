terraform {
    required_providers {
        acme = {
            source = "vancluever/acme"
            version = "2.41.0"
        }
        kubernetes = {
            source = "hashicorp/kubernetes"
            version = "3.0.1"
        }
        helm = {
            source = "hashicorp/helm"
            version = "3.1.1"
        }
        kubectl = {
            source  = "gavinbunney/kubectl"
            version = ">= 1.7.0"
        }
        cloudflare = {
            source = "cloudflare/cloudflare"
            version = "4.52.5"
        }
    }
}

provider "acme" {
    server_url = "https://acme-v02.api.letsencrypt.org/directory"
}

# Local:
# provider "kubernetes" {
#     config_path = "~/.kube/config"
#     config_context = "kind-rctf"
# }
#
# provider "helm" {
#     kubernetes = {
#         config_path = "~/.kube/config"
#         config_context = "kind-rctf"
#     }
# }

# GKE:
module "gke" {
    source = "../terraform-modules/gke"

    # TODO: make me configurable
    project_id = "sandbox-476301"
    region = "europe-west1"
    zone = "europe-west1-b"
    cluster_name = "rctf-instancer"
    machine_type = "e2-standard-4"
    min_node_count = 1
    max_node_count = 1
}
# gcloud container clusters get-credentials [cluster-name] --project=[...] --location=[...]

output "challenge_registry_url" {
    value = module.gke.challenge_repository_url
}

provider "kubernetes" {
    host = "https://${module.gke.endpoint}"
    cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)

    exec {
        api_version = "client.authentication.k8s.io/v1beta1"
        command = "gke-gcloud-auth-plugin"
    }
}

provider "helm" {
    kubernetes = {
        host = "https://${module.gke.endpoint}"
        cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)

        exec = {
            api_version = "client.authentication.k8s.io/v1beta1"
            command = "gke-gcloud-auth-plugin"
        }
    }
}

provider "kubectl" {
    host = "https://${module.gke.endpoint}"
    cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)

    exec {
        api_version = "client.authentication.k8s.io/v1beta1"
        command = "gke-gcloud-auth-plugin"
    }
}

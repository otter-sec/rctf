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
            version = "5.18.0"
        }
        google = {
            source = "hashicorp/google"
            version = "7.15.0"
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

provider "google" {
    project = var.gcp_project_id
    region  = var.gcp_region
}

# GKE:
module "gke" {
    source = "../modules/gke"

    project_id = var.gcp_project_id
    region = var.gcp_region
    zone = var.gcp_zone
    cluster_name = var.gcp_instancer_cluster_name
    machine_type = var.gcp_instancer_machine_type
    min_node_count = var.gcp_instancer_min_node_count
    max_node_count = var.gcp_instancer_max_node_count
}

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

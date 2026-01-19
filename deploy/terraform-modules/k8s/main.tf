terraform {
    required_providers {
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
    }
}

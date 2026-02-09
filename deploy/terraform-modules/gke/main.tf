terraform {
    required_providers {
        google = {
            source = "hashicorp/google"
            version = "7.15.0"
        }
    }
}

provider "google" {
    project = var.project_id
    region = var.region
}


resource "google_project_service" "service" {
    for_each = toset([
        "compute.googleapis.com",
        "container.googleapis.com",
    ])
    service = each.key

    disable_on_destroy = false
}
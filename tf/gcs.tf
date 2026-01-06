# terraform init && terraform apply -var="project_id=[...]" -var="region=europe-west1" -var="bucket_name=[...]"
# cat gcs-sa-key.json | jq '.private_key' | xargs printf

terraform {
    required_providers {
        google = {
            source = "hashicorp/google"
            version = "6.39.0"
        }
    }
}

variable "project_id" {
    type = string
    description = "The GCP project ID where the bucket should be created in."
}

variable "region" {
    type = string
    description = "The GCP region where the resources should be created in."
}

variable "bucket_name" {
    type = string
    description = "The bucket name where all of the challenges should be stored in."
}

variable "cors_allowed_origins" {
    type = list(string)
    description = "Allowed origins for bucket CORS."
    default = ["*"]
}

provider "google" {
    project = var.project_id
    region = var.region
}

resource "google_storage_bucket" "challenges" {
    name = var.bucket_name
    location = "EU"
    force_destroy = true

    cors {
        origin = var.cors_allowed_origins
        method = ["GET", "HEAD"]
        response_header = ["*"]
        max_age_seconds = 3600
    }
}

resource "google_project_iam_custom_role" "rctf_role" {
    role_id = "rctf_bucket_manager"
    title = "rCTF Bucket Manager"
    permissions = [
        "storage.objects.create",
        "storage.objects.get",
        "storage.objects.list",
        "storage.objects.delete",
    ]
}

resource "google_service_account" "rctf" {
    account_id = "rctf-bucket"
    display_name = "rCTF Bucket Service Account"
}

resource "google_storage_bucket_iam_member" "iam" {
    bucket = google_storage_bucket.challenges.name
    role = google_project_iam_custom_role.rctf_role.id
    member = "serviceAccount:${google_service_account.rctf.email}"
}

resource "google_service_account_key" "rctf_key" {
    service_account_id = google_service_account.rctf.name
}

resource "local_sensitive_file" "service_account_key_file" {
    content  = base64decode(google_service_account_key.rctf_key.private_key)
    filename = "${path.module}/gcs-sa-key.json"
}

output "rctf_sa_email" {
    value = google_service_account.rctf.email
}

output "bucket" {
    value = google_storage_bucket.challenges.url
}

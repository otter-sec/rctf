# GCS Upload Provider

The GCS upload provider uploads challenge resources to Google Cloud Storage. To use it, specify `uploads/gcs` for the upload provider name.

The key specified must have the `storage.objects.create`, `storage.objects.get`, and `storage.objects.list` permissions. The bucket itself does not need to be publicly accessible, as the attachments are individually marked as publicly accessible during their creation.

## Configuration Options

| YAML/JSON name             | environment name       | required | default value | type                                                       | description                                                                   |
| -------------------------- | ---------------------- | -------- | ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `credentials.private_key`  | `RCTF_GCS_CREDENTIALS` | yes      | _(none)_      | string                                                     | PEM-encoded private key for the service account with access to the GCS bucket |
| `credentials.client_email` | yes                    | _(none)_ | string        | email of the service account with access to the GCS bucket |
| `bucketName`               | yes                    | _(none)_ | string        | name of the GCS bucket                                     |

If available, the `RCTF_GCS_CREDENTIALS` environment variable is parsed as JSON. It should contain the `private_key` and `client_email` properties

## Configuration Example

```yaml
uploadProvider:
  name: 'uploads/gcs'
  options:
    bucketName: example
    credentials:
      private_key: |-
        -----BEGIN PRIVATE KEY-----
        ABCDABCD
        -----END PRIVATE KEY-----
      client_email: service-account-name@project-id.iam.gserviceaccount.com
```

## Terraform Deployment Example

```terraform
# terraform apply -var="project_id=[...]" -var="region=europe-west1" -var="bucket_name=[...]"

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

provider "google" {
    project = var.project_id
    region = var.region
}

resource "google_storage_bucket" "challenges" {
    name = var.bucket_name
    location = "EU"
    force_destroy = true
}

resource "google_project_iam_custom_role" "rctf_role" {
    role_id = "rctf_bucket_manager"
    title = "rCTF Bucket Manager"
    permissions = [
        "storage.objects.create",
        "storage.objects.get",
        "storage.objects.list",
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
```

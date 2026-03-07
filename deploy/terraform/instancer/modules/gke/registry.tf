# TODO: should this be part of the GKE module or separate?
resource "google_artifact_registry_repository" "challenge_registry" {
    repository_id = "challenge-registry"
    location = regex("^(.*)-[a-z]$", var.zone)[0]

    description = "Docker Registry for challenges"
    format = "DOCKER"

    cleanup_policies {
        id = "keep-minimum-versions"
        action = "KEEP"
        most_recent_versions {
            keep_count = 5
        }
    }

    cleanup_policies {
        id = "delete-old"
        action = "DELETE"
        condition {
            older_than = "30d"
        }
    }
}

resource "google_artifact_registry_repository_iam_member" "gke_artifact_reader" {
    repository = google_artifact_registry_repository.challenge_registry.name
    location = google_artifact_registry_repository.challenge_registry.location
    role = "roles/artifactregistry.writer"
    member = "serviceAccount:${google_service_account.gke.email}"

    lifecycle {
        # If the underlying instance gets replaced, the permission just gets lost... (@see https://github.com/hashicorp/terraform-provider-google/issues/14343)
        replace_triggered_by = [
            google_artifact_registry_repository.challenge_registry
        ]
    }
}

locals {
    challenge_repository_url = "${google_artifact_registry_repository.challenge_registry.location}-docker.pkg.dev/${google_artifact_registry_repository.challenge_registry.project}/${google_artifact_registry_repository.challenge_registry.repository_id}"
}

output "challenge_repository_url" {
    value = local.challenge_repository_url
}
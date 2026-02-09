resource "google_service_account" "gke" {
    account_id = var.cluster_name
    display_name = "GKE Service Account"
}

resource "google_container_cluster" "cluster" {
    name = var.cluster_name
    location = var.region
    node_locations = [var.zone]

    remove_default_node_pool = true
    initial_node_count = 1

    maintenance_policy {
        recurring_window {
            # We need 48h window of total maintenance time per month, therefore do 12h per week
            # on a non-weekend to avoid it happening during a CTF
            start_time = "2019-01-01T07:00:00Z"
            end_time = "2019-01-01T19:00:00Z"
            recurrence = "FREQ=WEEKLY;BYDAY=WE"
        }
    }

    # Even if we don't use this, this does metadata concealment (https://cloud.google.com/kubernetes-engine/docs/how-to/protecting-cluster-metadata#concealment)
    workload_identity_config {
        workload_pool = "${var.project_id}.svc.id.goog"
    }

    # https://cloud.google.com/kubernetes-engine/docs/release-notes
    release_channel {
        channel = "STABLE"
    }

    deletion_protection = false
}

resource "google_container_node_pool" "primary" {
    name = "${var.cluster_name}-primary"
    location = var.region
    cluster = google_container_cluster.cluster.name
    initial_node_count = var.initial_node_count

    node_config {
        preemptible = var.preemptible
        machine_type = var.machine_type
        image_type = "COS_CONTAINERD"

        service_account = google_service_account.gke.email
        oauth_scopes = [
            "https://www.googleapis.com/auth/cloud-platform",
        ]

        workload_metadata_config {
            mode = "GKE_METADATA"
        }

        metadata = {
            disable-legacy-endpoints = true
        }
    }

    autoscaling {
        min_node_count = var.min_node_count
        max_node_count = var.max_node_count
    }

    upgrade_settings {
        strategy = "SURGE"
        max_surge = 1
        max_unavailable = 0
    }

    lifecycle {
        ignore_changes = [
            initial_node_count
        ]
    }
}

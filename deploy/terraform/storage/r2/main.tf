terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.21"
    }
  }
}

variable "location" {
  type        = string
  description = "The R2 location hint."
}

variable "bucket_name" {
  type        = string
  description = "The bucket name where all of the challenges should be stored."
}

variable "zone_id" {
  type        = string
  description = "The Cloudflare zone ID for the base domain."
}

variable "subdomain" {
  type        = string
  description = "The subdomain to use for public R2 files."
  default     = "cdn"
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Allowed origins for bucket CORS."
  default     = ["*"]
}

provider "cloudflare" {}

data "cloudflare_zone" "domain" {
  zone_id = var.zone_id
}

locals {
  account_id    = data.cloudflare_zone.domain.account.id
  custom_domain = "${var.subdomain}.${data.cloudflare_zone.domain.name}"
}

resource "cloudflare_r2_bucket" "challenges" {
  account_id    = local.account_id
  name          = var.bucket_name
  location      = var.location
  storage_class = "Standard"
}

resource "cloudflare_r2_bucket_cors" "challenges" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.challenges.name

  rules = [{
    allowed = {
      methods = ["GET", "HEAD"]
      origins = var.cors_allowed_origins
      headers = ["*"]
    }

    max_age_seconds = 3600
  }]
}

resource "cloudflare_r2_custom_domain" "challenges" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.challenges.name
  domain      = local.custom_domain
  zone_id     = var.zone_id
  enabled     = true
  min_tls     = "1.2"
}

data "cloudflare_account_api_token_permission_groups_list" "r2_object_write" {
  account_id = local.account_id
  name       = "Workers R2 Storage Bucket Item Write"
}

resource "cloudflare_account_token" "rctf" {
  account_id = local.account_id
  name       = "rctf-bucket"

  policies = [{
    effect = "allow"

    permission_groups = [{
      id = data.cloudflare_account_api_token_permission_groups_list.r2_object_write.result[0].id
    }]

    resources = jsonencode({
      "com.cloudflare.edge.r2.bucket.${local.account_id}_default_${cloudflare_r2_bucket.challenges.name}" = "*"
    })
  }]
}

output "access_key_id" {
  value     = cloudflare_account_token.rctf.id
  sensitive = true
}

output "secret_access_key" {
  value     = sha256(cloudflare_account_token.rctf.value)
  sensitive = true
}

output "account_id" {
  value = local.account_id
}

output "bucket" {
  value = cloudflare_r2_bucket.challenges.name
}

output "public_base_url" {
  value = "https://${local.custom_domain}"
}

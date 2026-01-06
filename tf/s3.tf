# terraform init && terraform apply -var="region=eu-west-3" -var="bucket_name=[...]"
# TODO: CORS

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "region" {
  type        = string
  description = "The AWS region where the resources should be created."
}

variable "bucket_name" {
  type        = string
  description = "The bucket name where all of the challenges should be stored."
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "challenges" {
  bucket        = var.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "ownership" {
  bucket = aws_s3_bucket.challenges.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "public_read" {
  bucket = aws_s3_bucket.challenges.id
  acl    = "private"

  depends_on = [
    aws_s3_bucket_ownership_controls.ownership,
  ]
}

resource "aws_iam_user" "rctf" {
  name          = "rctf-bucket"
  force_destroy = true
}

resource "aws_iam_access_key" "rctf" {
  user = aws_iam_user.rctf.name
}

data "aws_iam_policy_document" "rctf_bucket_access" {
  statement {
    sid     = "ListBucket"
    effect  = "Allow"
    actions = ["s3:ListBucket"]
    resources = [
      aws_s3_bucket.challenges.arn,
    ]
  }

  statement {
    sid    = "ObjectCrud"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectAcl",
      "s3:PutObjectAcl",
    ]
    resources = [
      "${aws_s3_bucket.challenges.arn}/*",
    ]
  }
}

resource "aws_iam_user_policy" "rctf_bucket_access" {
  name   = "rctf-bucket-access"
  user   = aws_iam_user.rctf.name
  policy = data.aws_iam_policy_document.rctf_bucket_access.json
}

resource "local_sensitive_file" "access_key" {
  content = jsonencode({
    access_key_id     = aws_iam_access_key.rctf.id
    secret_access_key = aws_iam_access_key.rctf.secret
  })
  filename = "${path.module}/aws-rctf-access-key.json"
}

output "rctf_iam_user_arn" {
  value = aws_iam_user.rctf.arn
}

output "bucket" {
  value = aws_s3_bucket.challenges.bucket_regional_domain_name
}
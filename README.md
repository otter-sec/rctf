# rCTF

## Prerequisites and setup

- Bun v1.0+

```bash
# db and dependencies
docker compose -f compose.dev.yml up -d
bun i

# config
cat <<EOT > rctf.d/00-development.yaml
ctfName: rCTF Development
meta:
  description: 'Example rCTF instance'
  imageUrl: 'https://example.com'
homeContent: 'A description of your CTF. Markdown supported.'

origin: http://127.0.0.1:8080
divisions:
  open: Open
tokenKey: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
startTime: 0
endTime: 99999999999999

# email:
#   from: no-reply@example.com
#   provider:
#     name: 'emails/smtp'
#     options:
#       smtpUrl: 'smtp://username:password@example.com'

database:
  sql:
    host: 127.0.0.1
    user: rctf
    password: DO_NOT_USE_ME
    database: rctf
  redis:
    host: 127.0.0.1
    password: DO_NOT_USE_ME
  migrate: before
EOT

# migrate the database
bun run db:migrate

# run the thing
bun run dev
```

rCTF v1 frontend with rCTF v2 backend:

- `bun run dev` in this repo
- `yarn workspace @rctf/client dev` in the old repo
- access [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Roadmap

- [x] `/api/v1/auth/register`:
  - [x] User creation
  - [x] CTFTime login
  - [x] Divisions ACL
  - [x] Email verification:
    - [x] SMTP
    - [x] SES
    - [x] Postmark
    - [x] Mailgun
- [x] `/api/v1/auth/verify`:
  - [x] Register
  - [x] Recover
  - [x] Update
- [x] `/api/v1/auth/login`
- [x] `/api/v1/auth/recover`
- [x] `/api/v1/auth/test`

- [x] `/api/v1/challs`
- [x] `/api/v1/challs/:id/submit`
- [x] `/api/v1/challs/:id/solves`

- [x] `/api/v1/admin/challs`
- [x] `/api/v1/admin/challs/:id` DELETE
- [x] `/api/v1/admin/challs/:id` GET
- [x] `/api/v1/admin/challs/:id` POST
- [x] `/api/v1/admin/upload`
  - [x] Local
  - [x] GCS
  - [x] S3
- [x] `/api/v1/admin/upload/query`

- [x] `/api/v1/leaderboard/now`
- [x] `/api/v1/leaderboard/graph`

- [x] `/api/v1/integrations/client/config`
- [x] `/api/v1/integrations/ctftime/leaderboard`
- [x] `/api/v1/integrations/ctftime/callback`

- [x] `/api/v1/users/me`
- [x] `/api/v1/users/me` PATCH
- [x] `/api/v1/users/:id`
- [x] `/api/v1/users/me/members`
- [x] `/api/v1/users/me/members`
- [x] `/api/v1/users/me/members/:id`
- [x] `/api/v1/users/me/auth/email`
- [x] `/api/v1/users/me/auth/email`
- [x] `/api/v1/users/me/auth/ctftime`
- [x] `/api/v1/users/me/auth/ctftime`

- [ ] Run migrations programatically
- [ ] Go through all config vars and check that all of them are used

## New features compared to v1

- New `s3` upload provider

<details>
<sumary>s3.tf</summary>

```tf
# terraform init && terraform apply -var="region=eu-west-3" -var="bucket_name=[...]"

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
```
</details>

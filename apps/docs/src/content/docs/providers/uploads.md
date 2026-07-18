---
title: Upload providers
description: Configure file storage with local filesystem, Amazon S3, Cloudflare R2, or Google Cloud Storage.
order: 3
---

Upload providers handle storage for both challenge file attachments **and team avatars**. Both share the same provider, so anything you configure here applies to both.

:::warning[v2 needs delete permissions]
Unlike rCTF v1, the v2 upload provider needs permission to **delete** objects, not just upload them. Avatar replacement and admin-side file deletion both depend on it. If you reuse a v1 AWS policy that only grants `<green>s3:GetObject</green>` and `<green>s3:PutObject</green>`, add `<green>s3:DeleteObject</green>`. For GCS, the equivalent permission is `<green>storage.objects.delete</green>`; an R2 token needs object read/write access to the bucket.
:::

## Configuration

```yaml
uploadProvider:
  name: uploads/s3
  options:
    bucketName: my-ctf-uploads
    awsKeyId: AKIAIOSFODNN7EXAMPLE
    awsKeySecret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    awsRegion: us-east-1
```

You can keep storage credentials out of config files by using environment variables. Set `<yellow>RCTF_UPLOAD_PROVIDER</yellow>` to a provider such as `<green>uploads/s3</green>`, then provide the settings through the variables listed below. Environment values override the config file.

## File handling

- Files are stored by their SHA256 hash, so uploading the same file content twice doesn't create a duplicate.
- All uploaded files are served with immutable cache headers (`max-age=31536000`).
- Team avatars are resized to 256x256 pixels and converted to WebP format before upload. The maximum avatar size comes from the `<red>maxAvatarSize</red>` config option (default 1 MB).

## Providers

:::::tabs
::::tab[uploads/local]
Stores files on the local filesystem. This is the **default** provider.

```yaml
uploadProvider:
  name: uploads/local
  options:
    uploadDirectory: /path/to/uploads # Optional
```

| Option                       | Default                | Description                |
| ---------------------------- | ---------------------- | -------------------------- |
| `<red>uploadDirectory</red>` | `{cwd}/uploads/{:dir}` | Directory for file storage |

Files are served by the API server at `/uploads/*`. Path traversal protection is built in.

:::tip
The local provider works well for development and small events. S3, R2, or GCS is a better fit when many participants will download large challenge files, since those downloads no longer pass through the rCTF server.
:::
::::
::::tab[uploads/s3]
Stores files in an Amazon S3 bucket.

```yaml
uploadProvider:
  name: uploads/s3
  options:
    bucketName: my-ctf-uploads
    awsKeyId: AKIAIOSFODNN7EXAMPLE
    awsKeySecret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    awsRegion: us-east-1
```

| Option                    | Environment Variable      | Description           |
| ------------------------- | ------------------------- | --------------------- |
| `<red>bucketName</red>`   | `<yellow>RCTF_S3_BUCKET</yellow>`     | S3 bucket name        |
| `<red>awsKeyId</red>`     | `<yellow>RCTF_S3_KEY_ID</yellow>`     | AWS access key ID     |
| `<red>awsKeySecret</red>` | `<yellow>RCTF_S3_KEY_SECRET</yellow>` | AWS secret access key |
| `<red>awsRegion</red>`    | `<yellow>RCTF_S3_REGION</yellow>`     | AWS region            |

Files are stored with `public-read` ACL and `attachment` content disposition. The bucket has to allow public reads.
::::
::::tab[uploads/r2]
Stores files in a Cloudflare R2 bucket.

```yaml
uploadProvider:
  name: uploads/r2
  options:
    bucketName: my-ctf-uploads
    cfAccountId: 0123456789abcdef0123456789abcdef
    cfKeyId: 0123456789abcdef0123456789abcdef
    cfKeySecret: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    publicBaseUrl: https://cdn.example.com
```

| Option | Environment Variable | Description |
| --- | --- | --- |
| `<red>bucketName</red>` | `<yellow>RCTF_R2_BUCKET</yellow>` | R2 bucket name |
| `<red>cfAccountId</red>` | `<yellow>RCTF_R2_ACCOUNT_ID</yellow>` | Cloudflare account ID |
| `<red>cfKeyId</red>` | `<yellow>RCTF_R2_KEY_ID</yellow>` | R2 access key ID |
| `<red>cfKeySecret</red>` | `<yellow>RCTF_R2_KEY_SECRET</yellow>` | R2 secret access key |
| `<red>publicBaseUrl</red>` | `<yellow>RCTF_R2_PUBLIC_BASE_URL</yellow>` | Public bucket URL or custom domain |

The R2 API token needs permission to read, write, and delete objects. Configure the bucket for public access and set `<red>publicBaseUrl</red>` to its custom domain. Files are stored with `attachment` content disposition.
::::
::::tab[uploads/gcs]
Stores files in a Google Cloud Storage bucket.

```yaml
uploadProvider:
  name: uploads/gcs
  options:
    projectId: my-gcp-project
    bucketName: my-ctf-uploads
    credentials:
      type: service_account
      project_id: my-gcp-project
      private_key_id: ...
      private_key: ...
      client_email: ...
```

| Option | Environment Variable | Description |
| --- | --- | --- |
| `<red>projectId</red>` | `<yellow>RCTF_GCS_PROJECT_ID</yellow>` | GCP project ID |
| `<red>bucketName</red>` | `<yellow>RCTF_GCS_BUCKET</yellow>` | GCS bucket name |
| `<red>credentials</red>` | `<yellow>RCTF_GCS_CREDENTIALS</yellow>` | GCP credentials object (env var accepts JSON string) |

Files are stored with public visibility. The bucket has to be configured to allow public access.
::::
:::::

## Terraform templates

Terraform modules under `deploy/terraform/storage/{:dir}` can create an S3, R2, or GCS bucket, its CORS rules, and credentials limited to the permissions rCTF needs. Each module exposes the generated credentials as sensitive Terraform outputs for use in `rctf.d/{:dir}`.

::::tabs
:::tab[AWS S3]
```ansi
$ <red>cd</red> deploy/terraform/storage/main
$ <red>terraform</red> init
$ <red>terraform</red> apply <dim>-var=</dim><green>"region=eu-west-3"</green> <dim>-var=</dim><green>"bucket_name=my-ctf-uploads"</green>
```

Read the credentials for the dedicated `rctf-bucket` IAM user from the sensitive outputs (`rctf_iam_user_arn` and `bucket` are printed to stdout on apply):

```ansi
$ <red>terraform</red> output -raw access_key_id
$ <red>terraform</red> output -raw secret_access_key
```

Drop the credentials into your config:

```yaml title="rctf.d/03-uploads.yaml"
uploadProvider:
  name: uploads/s3
  options:
    bucketName: my-ctf-uploads
    awsKeyId: <access_key_id output>
    awsKeySecret: <secret_access_key output>
    awsRegion: eu-west-3
```

The module sets up CORS (`<route>GET</route>`, `<route>HEAD</route>` from any origin by default, which you can override with `<dim>-var=</dim><green>"cors_allowed_origins=[\"https://ctf.example.com\"]"</green>`) and grants the IAM user `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, plus the matching ACL actions and `s3:ListBucket`.
:::
:::tab[Cloudflare R2]

```ansi
$ <red>cd</red> deploy/terraform/storage/r2
$ <red>terraform</red> init
$ <red>terraform</red> apply <dim>-var=</dim><green>"location=weur"</green> <dim>-var=</dim><green>"bucket_name=my-ctf-uploads"</green> <dim>-var=</dim><green>"zone_id=your-domain-zone-id"</green>
```

The public R2 hostname defaults to `cdn.<your-zone-domain>`. Override the optional `subdomain` variable if you want a different hostname, for example with `<dim>-var=</dim><green>"subdomain=files"</green>`.

Terraform requires a Cloudflare account API token with `<route>Workers R2 Storage: Edit</route>`, `<route>Account API Tokens: Edit</route>`, and `<route>Zone: Read</route>`. Create one with this [preconfigured token template](https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_api_tokens%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%5D&name=rCTF%20Terraform%20Bootstrap). The module derives the account ID and base domain from the supplied zone ID, then creates a separate account API token with object access scoped to the new bucket. Only use the bootstrap token for Terraform; use the generated bucket-scoped credentials in rCTF.

Read the generated values from the Terraform outputs. The access key and secret are sensitive, so Terraform does not print them after apply:

```ansi
$ <red>terraform</red> output -raw access_key_id
$ <red>terraform</red> output -raw secret_access_key
```

Drop the outputs into your config:

```yaml title="rctf.d/03-uploads.yaml"
uploadProvider:
  name: uploads/r2
  options:
    bucketName: <bucket output>
    cfAccountId: <account_id output>
    cfKeyId: <access_key_id output>
    cfKeySecret: <secret_access_key output>
    publicBaseUrl: <public_base_url output>
```

The module creates the R2 bucket, connects the derived hostname as its public custom domain, and creates an account API token with object read, write, and delete access scoped to that bucket. Cloudflare creates the custom domain's DNS record when it connects the bucket, so the hostname must not already have a conflicting DNS record. It also allows CORS `<route>GET</route>` and `<route>HEAD</route>` requests from any origin by default. Restrict the allowed origins with `<dim>-var=</dim><green>"cors_allowed_origins=[\"https://ctf.example.com\"]"</green>`.
:::
:::tab[GCS]
```ansi
$ <red>cd</red> deploy/terraform/storage/gcs
$ <red>terraform</red> init
$ <red>terraform</red> apply <dim>-var=</dim><green>"project_id=my-gcp-project"</green> <dim>-var=</dim><green>"region=europe-west1"</green> <dim>-var=</dim><green>"bucket_name=my-ctf-uploads"</green>
```

Read the key for the dedicated `rctf-bucket` service account from the sensitive output (`rctf_sa_email` and `bucket` are printed to stdout on apply):

```ansi
$ <red>terraform</red> output -raw service_account_key
```

Drop the credentials into your config (paste the key JSON under `<red>credentials</red>`):

```yaml title="rctf.d/03-uploads.yaml"
uploadProvider:
  name: uploads/gcs
  options:
    projectId: my-gcp-project
    bucketName: my-ctf-uploads
    credentials:
      type: service_account
      project_id: my-gcp-project
      # ...rest of the service_account_key output
```

The module sets up CORS (`<route>GET</route>`, `<route>HEAD</route>` from any origin by default, which you can override with `<dim>-var=</dim><green>"cors_allowed_origins=[\"https://ctf.example.com\"]"</green>`) and grants the service account a custom role with `storage.objects.create`, `storage.objects.get`, `storage.objects.list`, and `storage.objects.delete`.
:::
::::

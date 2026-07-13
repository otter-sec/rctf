---
title: Upload providers
description: Configure file storage with local filesystem, Amazon S3, or Google Cloud Storage.
order: 3
---

Upload providers handle storage for both challenge file attachments **and team avatars**. Both share the same provider, so anything you configure here applies to both.

:::warning[v2 needs delete permissions]
Unlike rCTF v1, the v2 upload provider needs permission to **delete** objects, not just upload them. Avatar replacement and the admin-side file deletion flows both depend on it. If you reuse a v1 IAM policy that only grants `<green>s3:GetObject</green>` / `<green>s3:PutObject</green>`, add `<green>s3:DeleteObject</green>` to it (or the GCS equivalent `<green>storage.objects.delete</green>`).
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
The local provider works well for development and small events. S3 or GCS is a better fit when many participants will download large challenge files, since those downloads no longer pass through the rCTF server.
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

Terraform modules under `deploy/terraform/storage/{:dir}` can create an S3 or GCS bucket, its CORS rules, and credentials limited to the permissions rCTF needs. Each module writes the generated credentials to a local file for use in `rctf.d/{:dir}`.

::::tabs
:::tab[AWS S3]
```ansi
$ <red>cd</red> deploy/terraform/storage/main
$ <red>terraform</red> init
$ <red>terraform</red> apply <dim>-var=</dim><green>"region=eu-west-3"</green> <dim>-var=</dim><green>"bucket_name=my-ctf-uploads"</green>
```

Outputs are written next to the module:

- `aws-rctf-access-key.json{:file}` holds `{ access_key_id, secret_access_key }` for the dedicated `rctf-bucket` IAM user.
- `rctf_iam_user_arn` and `bucket` are Terraform outputs printed to stdout.

Drop the credentials into your config:

```yaml title="rctf.d/03-uploads.yaml"
uploadProvider:
  name: uploads/s3
  options:
    bucketName: my-ctf-uploads
    awsKeyId: <access_key_id from aws-rctf-access-key.json>
    awsKeySecret: <secret_access_key from aws-rctf-access-key.json>
    awsRegion: eu-west-3
```

The module sets up CORS (`<route>GET</route>`, `<route>HEAD</route>` from any origin by default, which you can override with `<dim>-var=</dim><green>"cors_allowed_origins=[\"https://ctf.example.com\"]"</green>`) and grants the IAM user `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, plus the matching ACL actions and `s3:ListBucket`.
:::
:::tab[GCS]
```ansi
$ <red>cd</red> deploy/terraform/storage/gcs
$ <red>terraform</red> init
$ <red>terraform</red> apply <dim>-var=</dim><green>"project_id=my-gcp-project"</green> <dim>-var=</dim><green>"region=europe-west1"</green> <dim>-var=</dim><green>"bucket_name=my-ctf-uploads"</green>
```

Outputs are written next to the module:

- `gcs-sa-key.json{:file}` holds the service-account key for the dedicated `rctf-bucket` service account.
- `rctf_sa_email` and `bucket` are Terraform outputs printed to stdout.

Drop the credentials into your config (paste the contents of `gcs-sa-key.json{:file}` under `<red>credentials</red>`):

```yaml title="rctf.d/03-uploads.yaml"
uploadProvider:
  name: uploads/gcs
  options:
    projectId: my-gcp-project
    bucketName: my-ctf-uploads
    credentials:
      type: service_account
      project_id: my-gcp-project
      # ...rest of gcs-sa-key.json
```

The module sets up CORS (`<route>GET</route>`, `<route>HEAD</route>` from any origin by default, which you can override with `<dim>-var=</dim><green>"cors_allowed_origins=[\"https://ctf.example.com\"]"</green>`) and grants the service account a custom role with `storage.objects.create`, `storage.objects.get`, `storage.objects.list`, and `storage.objects.delete`.
:::
::::

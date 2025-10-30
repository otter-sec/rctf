# Deploying Challenges

Now that you have the CTF platform up and are able to create challenges, it's time to deploy the challenges. There are
two primary types of challenge deployment types alongside static challenges:

- shared remote

- instanced remote

No matter how the challenge is deployed, it is considered a good practice to include a local setup of the challenge
for debugging purposes using Docker. This makes deploying the challenge on a remote also significantly easier, as most
solutions are designed around running a provided Docker image.

Additionally, we have support for hosting admin bots separately from the challenge to deal with spikes of page visits
and providing more accurate setup to local admin bots, as it simulates an external visitor instead of possibly relying on
internal IPs as expected in a local deployment.

## Shared Remote

In a shared remote, every competitor gets access to a single shared instance between all competitors. This is convenient
when the vulnerability does not depend on state or is sandboxed, for example, cryptographic vulnerability that proves
you're able to recover the secret value from the server.

Google has created [kCTF](https://google.github.io/kctf/introduction.html) for this purpose, which lets you run the challenges
on GCP while allowing you to scale the instances, have a healthcheck and automatically restart the instance if there are issues,
and securely sandbox the instances running on shared hosts. Though if you want a simpler option, shared instances can be run
on a traditional VPS either inside Docker or on the host itself as well.

### kCTF

kCTF has its own documentation [here](https://google.github.io/kctf/) already so we will not focus as much on how to deploy it,
and instead focus on things that may or may not be obvious especially when using it for the first time:

- When deploying kCTF, you have the option to control under which (sub)domain the challenges are available. The
  `kctf cluster create` command has the `--domain-name` option responsible for this, and you should expect to either:

      * use nameservers of Google if you want to host challenges under `*.example.com`, or
      * use a subdomain with a `NS` records pointing to Google so that challenges are available under `*.subdomain.example.com`

- By default, the created nodes are spot instances. This means that every 24 hours, the nodes will be changed and this
  will cause temporary downtime for the challenges. You can trigger cluster resize and explicitly not provide the spot instance
  flag to get rid of this behavior (e.g. `kctf cluster resize --min-nodes 1 --max-nodes 3 --num-nodes 1 --machine-type n2-standard-4`).

- If a healthcheck fails, the challenge will be automatically restarted, which may seem like connectivity issues to the challenge.
  In such scenarios, you should verify the output of `kctf chal status` to save some time debugging.

- Monitor your GCP project's quotas (the dashboard is nice enough to let you know which ones are reached / close to being reached!).
  Having too many challenges may cause the deployment to be stuck due to not enough available IPs due to low quota. Setting up kCTF
  in advance is also an easy way to have your quotas tested and help with automatic processing of quota increase requests.

- Some challenges deployed to kCTF may require additional changes due to certain hardening features, again, setting up kCTF
  in advance helps a lot with ironing out issues that would otherwise happen during the competition. [This](https://kubernetes.io/docs/concepts/workloads/pods/)
  may also help in understanding what options you can configure in a kCTF challenge instance (for example, additional volumes as the file system is read-only by default).

### Docker

If the complexity of kCTF is not desirable due to requiring the use of GCP and running Kubernetes, a simple option is to
use Docker for your challenges on a single (or multiple) hosts dedicated for hosting the challenges. One should avoid reusing
the same VPS as for the CTF platform because people may send large amount of traffic towards them and isolating competitor's
data from by-design vulnerable services is a great practice.

The easiest option to deploy this is to just use [Docker Compose](https://docs.docker.com/compose/) and start all the
challenges on unique ports for each challenge. Keep in mind that if the challenge leads to RCE, there's a risk of container
breakouts (especially if any of the challenges require additional privileges) or general malicious usage like filling up
the disk.

**It is also extremely important to make sure competitors are not able to access any internal metadata services
(e.g. http://169.254.169.254 on AWS/GCP cloud providers which have access credentials to the cloud account).**

### VM

One other option is to also have a VM (or VPS) per instance. Although a bit pricier than just running the challenges on a
single host, you reduce the blast radius from single challenge affecting every other challenge if someone decides to fill up
the disk of the host, and so on.

There is no correct way to do this, and it usually depends on the challenge itself on how it was intended to be run.

**It is also extremely important to make sure competitors are not able to access any internal metadata services
(e.g. http://169.254.169.254 on AWS/GCP cloud providers which have access credentials to the cloud account).**

## Instanced Remote

In an instanced remove, every competitor gets their personal instance. This is useful because certain vulnerabilities by
design give file write or remote code execution, which then could be abused by competitors to make the challenge not work
as intended, remove the flag, and so on.

### Klodd

The only way to have instanced challenges on rCTF as of this moment is to use a third-party integration called [Klodd](https://klodd.tjcsec.club/).
The architecture is close to kCTF where challenges are deployed onto a Kubernetes cluster on-demand, and they also have their own
documentation.

#### GCP

Here's a quick start guide on how to set up the required prerequisites for Klodd on GCP using GKE:

```bash
gcloud config set project [project-id]
gcloud contianer clusters create --release-channel regular --zone europe-west1-b --enable-network-policy --enable-autoscaling \
  --min-nodes 1 --max-nodes 4 --num-nodes 1 --no-enable-master-authorized-networks --enable-autorepair \
  --machine-type e2-standard-8 klodd-cluster
gcloud container clusters get-crednetials klodd-cluster --zone europe-west1-b

gcloud compute addresses create klodd-ip --region europe-west1
gcloud compute addresses list # note down the external IP of klodd-ip
```

Set up a Cloudflare Worker for authentication by following instructions [here](https://klodd.tjcsec.club/install-guide/prerequisites/#rctf).
Then, follow [certbot's instructions](https://certbot.eff.org/instructions) on how to provision a certificate, ideally using
a wildcard certificate for a subdomain under which all the instances are and the instancer URL itself:

```bash
certbot certonly --manual --preferred-challenge=dns --email [email] -d instancer.example.com,*.instancer.example.com
```

After that, we can deploy Klodd onto the created GKE cluster. We will use the files inside [our example CTF repository's](https://github.com/otter-sec/rctf-example-ctf)
`klodd/` folder as the base:

```bash
kubectl apply -f 00-traefik.yaml # remember to update fullchain, private key, and the load balancer IP
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.4/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml
kubectl apply -f https://raw.githubusercontent.com/TJCSec/klodd/master/manifests/klodd-crd.yaml
kubectl apply -f https://raw.githubusercontent.com/TJCSec/klodd/master/manifests/klodd-rbac.yaml
kubectl apply -f 10-klodd.yaml # remember to update the klodd configuration, and all the *.example.com URLs here
```

Create a wildcard `A` DNS record for `*.instancer.example.com` -> [klodd-ip] and `A` DNS record for `instancer.example.com` ->
[klodd-ip]. After that, you should be able to follow Klodd's guide on how to deploy an individual challenge.

## Admin Bot

To use the admin bot, we can use the examples found [here](https://github.com/otter-sec/rctf-admin-bot/tree/main/examples). First,
we'll create our custom Docker image using the `image` folder as a base. The `config.js` folder should be modified to run
standard Puppeteer actions required for the challenge. After that, we'll need to build the image and upload to a Docker registry. In this example,
we'll use GCP's Artifact Registry for this:

```bash
gcloud artifacts repositories create misc-images \
    --repository-format=docker \
    --location=europe-west1
gcloud auth configure-docker europe-west1-docker.pkg.dev # configure authentication

cd image
docker build -t europe-west1-docker.pkg.dev/[PROJECT_ID]/misc-images/admin-bot:latest .
docker push europe-west1-docker.pkg.dev/[PROJECT_ID]/misc-images/admin-bot:latest
```

Then, we can use the `gcp` folder to automatically deploy everything required using [Terraform](https://developer.hashicorp.com/terraform).
Navigate to the `gcp` folder and copy `terraform.tfvars.example` to `terraform.tfvars`. Inside that file, update
project variable to contain your GCP project ID, and image to the image pushed above. Optionally, you can also configure
reCAPTCHA to prevent spamming submissions if desired. Then, deploy the admin bot by running the following commands:

```bash
terraform init
terraform apply # type `yes` when prompted
```

After a couple of minutes, you should get a submit URL that can be used to access the admin bot at `/[challenge name]`. If
desired, you can also [map a custom domain](https://cloud.google.com/run/docs/mapping-custom-domains) for the submit Cloud Run
in the GCP dashboard for a nicer looking link.

# Example rCTF Terraform Deployment

This is an example rCTF terraform deployment that sets up:

- k8s-instancer (DNS, certificates, GKE, and all k8s-specific components required)

## k8s-instancer

After deployment, to set up `kubectl` locally you can use `gcloud container clusters get-credentials [cluster-name] --project=[...] --location=[...]` to get the kubeconfig credentials.

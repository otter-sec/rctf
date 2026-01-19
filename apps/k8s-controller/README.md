# k8s-controller

## Deploying a Local Environment

```bash
# install kind from https://kind.sigs.k8s.io/docs/user/quick-start/
go install sigs.k8s.io/cloud-provider-kind@latest # required for routing inside the cluster
kind create cluster --name rctf --config kind-config.yaml
cloud-provider-kind # run this in a separate session so that LoadBalancer services get external IP (i.e. for the host)
cd ../../deploy/example && terraform apply # deploy required components for rctf-instancer
make install # install CRDs
make run ARGS="-instancer-host instancer.test" # run controller
kubectl apply -f config/sample/rctf-instancer_v1_challengeinstance.yaml # test ChallengeInstance

# after finishing development:
kind delete cluster --name rctf
```

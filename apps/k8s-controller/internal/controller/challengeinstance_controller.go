/*
Copyright 2025.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	rctfinstancerv1 "github.com/otter-sec/rctf-new/api/v1"
	"github.com/traefik/traefik/v2/pkg/config/dynamic"
	"github.com/traefik/traefik/v2/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	v1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// ChallengeInstanceReconciler reconciles a ChallengeInstance object
type ChallengeInstanceReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	APIReader client.Reader

	InstancerHost string
}

const (
	finalizer                   = "rctf.osec.io/finalizer"
	labelTeamId                 = "rctf.osec.io/team-id"
	labelChallengeId            = "rctf.osec.io/challenge-id"
	labelPod                    = "rctf.osec.io/pod"
	labelEgress                 = "rctf.osec.io/egress"
	labelExposed                = "rctf.osec.io/exposed"
	managedBy                   = "rctf-instancer"
	typeReady                   = "Ready"
	typeNamespaceDeployed       = "NamespaceDeployed"
	typeNetworkPoliciesDeployed = "NetworkPoliciesDeployed"
	typeDeploymentsDeployed     = "DeploymentsDeployed"
	typeServicesDeployed        = "ServicesDeployed"
	typeIngressesDeployed       = "IngressesDeployed"
)

// +kubebuilder:rbac:groups=rctf-instancer.osec.io,resources=challengeinstances,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=rctf-instancer.osec.io,resources=challengeinstances/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=rctf-instancer.osec.io,resources=challengeinstances/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=ingressroutes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=ingressroutetcps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=middlewares,verbs=get;list;watch;create;update;patch;delete

func getNamespaceForInstance(instance rctfinstancerv1.ChallengeInstance) string {
	return fmt.Sprintf(
		"inst-%s-%s",
		strings.ToLower(instance.Spec.ChallengeId),
		strings.ToLower(instance.Spec.TeamId),
	)
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ChallengeInstanceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (result ctrl.Result, err error) {
	log := logf.FromContext(ctx)

	// Bypass the manager cache for fetching instance - repeated reconciliations will cause it to be outdated as cache hasn't been updated with the status changes
	// TODO: surely there's a better way that this should be handled...?
	var instance rctfinstancerv1.ChallengeInstance
	if err := r.APIReader.Get(ctx, req.NamespacedName, &instance); err != nil {
		if apierrors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}

		log.Error(err, "Unable to fetch ChallengeInstance")
		return ctrl.Result{}, err
	}

	if !instance.ObjectMeta.DeletionTimestamp.IsZero() {
		namespaceName := getNamespaceForInstance(instance)

		if err := r.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}); err != nil {
			if !apierrors.IsNotFound(err) {
				log.Error(err, "Unable to delete namespace")
				return ctrl.Result{}, err
			}
		}

		err := r.Get(ctx, types.NamespacedName{Name: namespaceName}, &corev1.Namespace{})
		if err == nil {
			return ctrl.Result{RequeueAfter: 1 * time.Second}, nil
		}

		if !apierrors.IsNotFound(err) {
			log.Error(err, "Unable to fetch Namespace")
			return ctrl.Result{}, err
		}

		controllerutil.RemoveFinalizer(&instance, finalizer)
		if err := r.Update(ctx, &instance); err != nil {
			log.Error(err, "Unable to remove finalizer")
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	if !controllerutil.ContainsFinalizer(&instance, finalizer) {
		controllerutil.AddFinalizer(&instance, finalizer)
		if err := r.Update(ctx, &instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
		}
	}

	if time.Now().After(instance.Spec.ExpiresAt.Time) {
		if err := r.Delete(ctx, &instance); err != nil {
			log.Error(err, "Unable to delete Challenge Instance")
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeReady); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeReady,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, &instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return ctrl.Result{}, err
		}
	}

	// If the deployment fails at any point, we want the status to reflect that so the user knows not to wait for the deployment. Though
	// the status should only update if it failed on the initial deployment. If we deploy it successfully and something breaks afterward,
	// that's mostly ok as things _should_ be still in a working state (and it just indicates an intermittent API issue?)
	defer func() {
		if err != nil {
			if condition := meta.FindStatusCondition(instance.Status.Conditions, typeReady); condition != nil && condition.Status == metav1.ConditionFalse {
				meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:   typeReady,
					Status: metav1.ConditionUnknown,
					Reason: "DeployFailed",
				})
				if err := r.Status().Update(ctx, &instance); err != nil {
					log.Error(err, "Unable to update ChallengeInstance")
				}
			}
		}
	}()

	if err := r.EnsureNamespace(ctx, &instance); err != nil {
		log.Error(err, "Unable to ensure namespace state")
		return ctrl.Result{}, err
	}

	if err := r.EnsureNetworkPolicies(ctx, &instance); err != nil {
		log.Error(err, "Unable to ensure network policies state")
		return ctrl.Result{}, err
	}

	if err := r.EnsureDeployments(ctx, &instance); err != nil {
		log.Error(err, "Unable to ensure deployment state")
		return ctrl.Result{}, err
	}

	if err := r.EnsureServices(ctx, &instance); err != nil {
		log.Error(err, "Unable to ensure service state")
		return ctrl.Result{}, err
	}

	if err := r.EnsureIngresses(ctx, &instance); err != nil {
		log.Error(err, "Unable to ensure ingress state")
		return ctrl.Result{}, err
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   typeReady,
		Status: metav1.ConditionTrue,
		Reason: "DeploySucceeded",
	})
	if err := r.Status().Update(ctx, &instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
		return ctrl.Result{}, err
	}

	return ctrl.Result{
		RequeueAfter: time.Until(instance.Spec.ExpiresAt.Time),
	}, nil
}

func (r *ChallengeInstanceReconciler) EnsureNamespace(ctx context.Context, instance *rctfinstancerv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeNamespaceDeployed); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeNamespaceDeployed,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}
	}

	namespaceName := getNamespaceForInstance(*instance)

	err := r.Get(ctx, types.NamespacedName{Name: namespaceName}, &corev1.Namespace{})
	if err == nil {
		return nil
	}

	if !apierrors.IsNotFound(err) {
		return fmt.Errorf("getting namespace failed: %w", err)
	}

	namespace := corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespaceName,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": managedBy,
				labelTeamId:                    instance.Spec.TeamId,
				labelChallengeId:               instance.Spec.ChallengeId,
			},
		},
	}
	if err := r.Create(ctx, &namespace); err != nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:    typeNamespaceDeployed,
			Status:  metav1.ConditionFalse,
			Message: err.Error(),
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}

		return fmt.Errorf("creating namespace failed: %w", err)
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:    typeNamespaceDeployed,
		Status:  metav1.ConditionTrue,
		Reason:  "DeploySucceeded",
		Message: fmt.Sprintf("The namespace %s was created successfully", namespaceName),
	})
	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
	}

	return nil
}

func (r *ChallengeInstanceReconciler) EnsureNetworkPolicies(ctx context.Context, instance *rctfinstancerv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)
	namespaceName := getNamespaceForInstance(*instance)

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeNetworkPoliciesDeployed); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeNetworkPoliciesDeployed,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}
	}

	udp := corev1.ProtocolUDP
	dnsPort := intstr.FromInt32(int32(53))
	for _, networkPolicy := range []networkingv1.NetworkPolicy{
		// Restrict network traffic only to inside the instance's namespace (except for kube-dns)
		{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespaceName,
				Name:      "isolate-namespace",
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": managedBy,
					labelTeamId:                    instance.Spec.TeamId,
					labelChallengeId:               instance.Spec.ChallengeId,
				},
			},
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metav1.LabelSelector{},
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress, networkingv1.PolicyTypeEgress},
				Ingress: []networkingv1.NetworkPolicyIngressRule{
					{
						From: []networkingv1.NetworkPolicyPeer{
							{
								NamespaceSelector: &metav1.LabelSelector{
									MatchLabels: map[string]string{
										"app.kubernetes.io/managed-by": managedBy,
										labelTeamId:                    instance.Spec.TeamId,
										labelChallengeId:               instance.Spec.ChallengeId,
									},
								},
							},
						},
					},
				},
				Egress: []networkingv1.NetworkPolicyEgressRule{
					{
						To: []networkingv1.NetworkPolicyPeer{
							{
								NamespaceSelector: &metav1.LabelSelector{
									MatchLabels: map[string]string{
										"app.kubernetes.io/managed-by": managedBy,
										labelTeamId:                    instance.Spec.TeamId,
										labelChallengeId:               instance.Spec.ChallengeId,
									},
								},
							},
						},
					},
					{
						To: []networkingv1.NetworkPolicyPeer{
							{
								NamespaceSelector: &metav1.LabelSelector{
									MatchLabels: map[string]string{
										"kubernetes.io/metadata.name": "kube-system",
									},
								},
							},
						},
						Ports: []networkingv1.NetworkPolicyPort{
							{
								Protocol: &udp,
								Port:     &dnsPort,
							},
						},
					},
				},
			},
		},
		// traefik -> instance namespace
		{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespaceName,
				Name:      "ingress-traefik",
			},
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metav1.LabelSelector{
					MatchLabels: map[string]string{
						labelExposed: "true",
					},
				},
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
				Ingress: []networkingv1.NetworkPolicyIngressRule{
					{
						From: []networkingv1.NetworkPolicyPeer{
							// TODO: should we let the end-user configure this (or at least the namespace and app name)?
							{
								NamespaceSelector: &metav1.LabelSelector{
									MatchLabels: map[string]string{
										"kubernetes.io/metadata.name": "traefik",
									},
								},
								PodSelector: &metav1.LabelSelector{
									MatchLabels: map[string]string{
										"app.kubernetes.io/name": "traefik",
									},
								},
							},
						},
					},
				},
			},
		},
		// optionally enabled egress for individual pods
		{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespaceName,
				Name:      "egress",
			},
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metav1.LabelSelector{
					MatchLabels: map[string]string{
						labelEgress: "true",
					},
				},
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeEgress},
				Egress: []networkingv1.NetworkPolicyEgressRule{
					{
						To: []networkingv1.NetworkPolicyPeer{
							{
								IPBlock: &networkingv1.IPBlock{
									CIDR: "0.0.0.0/0",
									Except: []string{
										"10.0.0.0/8",
										"172.16.0.0/12",
										"192.168.0.0/16",
										"100.64.0.0/10",
										"169.254.0.0/16",
									},
								},
							},
						},
					},
				},
			},
		},
	} {
		var networkPolicyTmp networkingv1.NetworkPolicy
		err := r.Get(ctx, types.NamespacedName{Namespace: namespaceName, Name: networkPolicy.Name}, &networkPolicyTmp)
		if err == nil {
			// TODO: consider supporting patching the service - though this is very unlikely use-case
			continue
		}

		if !apierrors.IsNotFound(err) {
			return fmt.Errorf("getting network policy %s failed: %w", networkPolicy.Name, err)
		}

		if err := ctrl.SetControllerReference(instance, &networkPolicy, r.Scheme); err != nil {
			return fmt.Errorf("setting controller reference for network policy %s failed: %w", networkPolicy.Name, err)
		}

		if err := r.Create(ctx, &networkPolicy); err != nil {
			return fmt.Errorf("creating network policy %s failed: %w", networkPolicy.Name, err)
		}
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   typeNetworkPoliciesDeployed,
		Status: metav1.ConditionTrue,
		Reason: "DeploySucceeded",
	})
	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
		return err
	}

	return nil
}

func (r *ChallengeInstanceReconciler) EnsureDeployments(ctx context.Context, instance *rctfinstancerv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)
	namespaceName := getNamespaceForInstance(*instance)

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeDeploymentsDeployed); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeDeploymentsDeployed,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}
	}

	for _, pod := range instance.Spec.Pods {
		var deployment v1.Deployment
		err := r.Get(ctx, types.NamespacedName{Namespace: namespaceName, Name: pod.Name}, &deployment)
		if err == nil {
			// TODO: consider supporting patching the deployment - though this is very unlikely use-case
			continue
		}

		if !apierrors.IsNotFound(err) {
			return fmt.Errorf("getting deployment %s failed: %w", pod.Name, err)
		}

		egress := "false"
		if pod.Egress {
			egress = "true"
		}

		exposed := "false"
		for _, expose := range instance.Spec.Expose {
			if expose.ContainerName != pod.Name {
				continue
			}

			exposed = "true"
			break
		}

		var replicas int32 = 1
		deployment = v1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespaceName,
				Name:      pod.Name,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": managedBy,
					labelTeamId:                    instance.Spec.TeamId,
					labelChallengeId:               instance.Spec.ChallengeId,
				},
			},
			Spec: v1.DeploymentSpec{
				Replicas: &replicas,
				Selector: &metav1.LabelSelector{
					MatchLabels: map[string]string{
						labelPod: pod.Name,
					},
				},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{
						Labels: map[string]string{
							labelTeamId:      instance.Spec.TeamId,
							labelChallengeId: instance.Spec.ChallengeId,
							labelPod:         pod.Name,
							labelEgress:      egress,
							labelExposed:     exposed,
						},
					},
					Spec: pod.Spec,
				},
			},
		}

		if err := ctrl.SetControllerReference(instance, &deployment, r.Scheme); err != nil {
			return fmt.Errorf("setting controller reference for deployment %s failed: %w", pod.Name, err)
		}

		if err := r.Create(ctx, &deployment); err != nil {
			return fmt.Errorf("creating deployment %s failed: %w", pod.Name, err)
		}
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   typeDeploymentsDeployed,
		Status: metav1.ConditionTrue,
		Reason: "DeploySucceeded",
	})
	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
		return err
	}

	return nil
}

func (r *ChallengeInstanceReconciler) EnsureServices(ctx context.Context, instance *rctfinstancerv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)
	namespaceName := getNamespaceForInstance(*instance)

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeServicesDeployed); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeServicesDeployed,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}
	}

	for _, pod := range instance.Spec.Pods {
		var service corev1.Service
		err := r.Get(ctx, types.NamespacedName{Namespace: namespaceName, Name: pod.Name}, &service)
		if err == nil {
			// TODO: consider supporting patching the service - though this is very unlikely use-case
			continue
		}

		if !apierrors.IsNotFound(err) {
			return fmt.Errorf("getting service %s failed: %w", pod.Name, err)
		}

		service = corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespaceName,
				Name:      pod.Name,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": managedBy,
					labelTeamId:                    instance.Spec.TeamId,
					labelChallengeId:               instance.Spec.ChallengeId,
				},
			},
			Spec: corev1.ServiceSpec{
				Selector: map[string]string{
					labelPod: pod.Name,
				},
				Ports: pod.Ports,
			},
		}

		if err := ctrl.SetControllerReference(instance, &service, r.Scheme); err != nil {
			return fmt.Errorf("setting controller reference for service %s failed: %w", pod.Name, err)
		}

		if err := r.Create(ctx, &service); err != nil {
			return fmt.Errorf("creating service %s failed: %w", pod.Name, err)
		}
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   typeServicesDeployed,
		Status: metav1.ConditionTrue,
		Reason: "DeploySucceeded",
	})
	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
		return err
	}

	return nil
}

func exposeTypeToPort(exposeType rctfinstancerv1.ExposeType) uint16 {
	switch exposeType {
	// TCP is not supported (for now)
	case rctfinstancerv1.TCP_SSL:
		return 1337
	case rctfinstancerv1.HTTP:
		return 80
	case rctfinstancerv1.HTTPS:
		return 443
	default:
		panic(fmt.Sprintf("unsupported expose kind %s", exposeType))
	}
}

func exposeToObjects(instance *rctfinstancerv1.ChallengeInstance, expose rctfinstancerv1.ChallengeInstanceExpose, hostname string) []client.Object {
	namespaceName := getNamespaceForInstance(*instance)

	switch expose.Kind {
	// TCP is not supported (for now)
	case rctfinstancerv1.HTTP:
		return []client.Object{
			&v1alpha1.IngressRoute{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-http", expose.ContainerName),
					Labels: map[string]string{
						"app.kubernetes.io/managed-by": managedBy,
						labelTeamId:                    instance.Spec.TeamId,
						labelChallengeId:               instance.Spec.ChallengeId,
					},
				},
				Spec: v1alpha1.IngressRouteSpec{
					EntryPoints: []string{"web"},
					Routes: []v1alpha1.Route{
						{
							Kind:     "Rule",
							Match:    fmt.Sprintf("Host(`%s`)", hostname),
							Priority: 10,
							// TODO: traefik middlewares?
							Services: []v1alpha1.Service{
								{
									LoadBalancerSpec: v1alpha1.LoadBalancerSpec{
										Name:      expose.ContainerName,
										Namespace: namespaceName,
										Port:      intstr.FromInt32(int32(expose.ContainerPort)),
									},
								},
							},
						},
					},
				},
			},
		}
	case rctfinstancerv1.HTTPS:
		return []client.Object{
			&v1alpha1.Middleware{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-redirect", expose.ContainerName),
				},
				Spec: v1alpha1.MiddlewareSpec{
					RedirectScheme: &dynamic.RedirectScheme{
						Scheme:    "https",
						Permanent: false,
					},
				},
			},
			&v1alpha1.IngressRoute{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-http-redirect", expose.ContainerName),
					Labels: map[string]string{
						"app.kubernetes.io/managed-by": managedBy,
						labelTeamId:                    instance.Spec.TeamId,
						labelChallengeId:               instance.Spec.ChallengeId,
					},
				},
				Spec: v1alpha1.IngressRouteSpec{
					EntryPoints: []string{"web"},
					Routes: []v1alpha1.Route{
						{
							Kind:     "Rule",
							Match:    fmt.Sprintf("Host(`%s`)", hostname),
							Priority: 5, // if there's HTTP on the same host prefix, we want that to have the priority over this
							Middlewares: []v1alpha1.MiddlewareRef{
								{
									Name: fmt.Sprintf("%s-redirect", expose.ContainerName),
								},
							},
							Services: []v1alpha1.Service{
								// Traefik requires us to attach a service or a child router even if we have a redirect middleware
								{
									LoadBalancerSpec: v1alpha1.LoadBalancerSpec{
										Name: "noop@internal",
										Kind: "TraefikService",
									},
								},
							},
						},
					},
				},
			},
			&v1alpha1.IngressRoute{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-https", expose.ContainerName),
					Labels: map[string]string{
						"app.kubernetes.io/managed-by": managedBy,
						labelTeamId:                    instance.Spec.TeamId,
						labelChallengeId:               instance.Spec.ChallengeId,
					},
				},
				Spec: v1alpha1.IngressRouteSpec{
					EntryPoints: []string{"websecure"},
					Routes: []v1alpha1.Route{
						{
							Kind:     "Rule",
							Match:    fmt.Sprintf("Host(`%s`)", hostname),
							Priority: 10,
							// TODO: traefik middlewares?
							Services: []v1alpha1.Service{
								{
									LoadBalancerSpec: v1alpha1.LoadBalancerSpec{
										Name:      expose.ContainerName,
										Namespace: namespaceName,
										Port:      intstr.FromInt32(int32(expose.ContainerPort)),
									},
								},
							},
						},
					},
				},
			},
		}
	case rctfinstancerv1.TCP_SSL:
		return []client.Object{
			&v1alpha1.IngressRouteTCP{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-tcp-ssl", expose.ContainerName),
					Labels: map[string]string{
						"app.kubernetes.io/managed-by": managedBy,
						labelTeamId:                    instance.Spec.TeamId,
						labelChallengeId:               instance.Spec.ChallengeId,
					},
				},
				Spec: v1alpha1.IngressRouteTCPSpec{
					EntryPoints: []string{"tcp"},
					TLS:         &v1alpha1.TLSTCP{},
					Routes: []v1alpha1.RouteTCP{
						{
							Match:    fmt.Sprintf("HostSNI(`%s`)", hostname),
							Priority: 10,
							// TODO: traefik middlewares?
							Services: []v1alpha1.ServiceTCP{
								{
									Name:      expose.ContainerName,
									Namespace: namespaceName,
									Port:      intstr.FromInt32(int32(expose.ContainerPort)),
								},
							},
						},
					},
				},
			},
		}
	default:
		panic(fmt.Sprintf("unknown expose kind %s", expose.Kind))
	}
}

func (r *ChallengeInstanceReconciler) EnsureIngresses(ctx context.Context, instance *rctfinstancerv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)
	namespaceName := getNamespaceForInstance(*instance)

	if condition := meta.FindStatusCondition(instance.Status.Conditions, typeIngressesDeployed); condition == nil {
		meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:   typeIngressesDeployed,
			Status: metav1.ConditionFalse,
			Reason: "DeployInProgress",
		})
		if err := r.Status().Update(ctx, instance); err != nil {
			log.Error(err, "Unable to update ChallengeInstance")
			return err
		}
	}

	instance.Status.Endpoints = nil // in case an operation fails, we don't want n duplicates
	for _, expose := range instance.Spec.Expose {
		if expose.Kind == rctfinstancerv1.TCP {
			// TODO: Log this? though we want to disallow this on the backend

			// Right now, rCTF assumes we return expose -> endpoints mapped in the exact same order
			instance.Status.Endpoints = append(instance.Status.Endpoints, rctfinstancerv1.ChallengeInstanceStatusEndpoint{
				Kind:  expose.Kind,
				Host:  "unsupported-by-instancer",
				Port:  0,
				Title: nil,
			})
			continue
		}

		// Because the reconciliation can run multiple times, we want to generate this in a deterministic manner, but not so that
		// a competitor could guess other people's instances
		// TODO: investigate if these are truly random?
		hostname := fmt.Sprintf("%s-%s.%s", expose.HostPrefix, strings.ReplaceAll(string(instance.UID), "-", "")[:12], r.InstancerHost)

		objects := exposeToObjects(instance, expose, hostname)
		for _, object := range objects {
			err := r.Get(ctx, types.NamespacedName{Namespace: namespaceName, Name: object.GetName()}, object)
			if err == nil {
				// TODO: consider supporting patching the objects - though this is very unlikely use-case
				continue
			}

			if !apierrors.IsNotFound(err) {
				return fmt.Errorf("getting object %s failed: %w", object.GetName(), err)
			}

			if err := ctrl.SetControllerReference(instance, object, r.Scheme); err != nil {
				return fmt.Errorf("setting controller reference for object %s failed: %w", object.GetName(), err)
			}

			if err := r.Create(ctx, object); err != nil {
				return fmt.Errorf("creating object %s failed: %w", object.GetName(), err)
			}
		}

		instance.Status.Endpoints = append(instance.Status.Endpoints, rctfinstancerv1.ChallengeInstanceStatusEndpoint{
			Kind:  expose.Kind,
			Host:  hostname,
			Port:  exposeTypeToPort(expose.Kind),
			Title: expose.Title,
		})
	}

	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   typeIngressesDeployed,
		Status: metav1.ConditionTrue,
		Reason: "DeploySucceeded",
	})
	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Unable to update ChallengeInstance")
		return err
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ChallengeInstanceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.APIReader = mgr.GetAPIReader()

	return ctrl.NewControllerManagedBy(mgr).
		For(&rctfinstancerv1.ChallengeInstance{}).
		Owns(&v1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&networkingv1.NetworkPolicy{}).
		Owns(&v1alpha1.IngressRoute{}).
		Owns(&v1alpha1.IngressRouteTCP{}).
		Owns(&v1alpha1.Middleware{}).
		Named("challengeinstance").
		Complete(r)
}

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
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	rctfv1 "github.com/otter-sec/rctf/api/v1"
	"github.com/traefik/traefik/v2/pkg/config/dynamic"
	"github.com/traefik/traefik/v2/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/util/retry"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// ChallengeInstanceReconciler reconciles a ChallengeInstance object
type ChallengeInstanceReconciler struct {
	client.Client
	Scheme *runtime.Scheme

	InstancerHost string
}

const (
	finalizer                   = "rctf.osec.io/finalizer"
	labelManagedBy              = "app.kubernetes.io/managed-by"
	labelTeamId                 = "rctf.osec.io/team-id"
	labelChallengeId            = "rctf.osec.io/challenge-id"
	labelPod                    = "rctf.osec.io/pod"
	labelEgress                 = "rctf.osec.io/egress"
	labelExposed                = "rctf.osec.io/exposed"
	annotationExposedHostnames  = "rctf.osec.io/exposed-hostnames"
	managedBy                   = "rctf-operator"
	typeReady                   = "Ready"
	typeNamespaceDeployed       = "NamespaceDeployed"
	typeNetworkPoliciesDeployed = "NetworkPoliciesDeployed"
	typeDeploymentsDeployed     = "DeploymentsDeployed"
	typeServicesDeployed        = "ServicesDeployed"
	typeIngressesDeployed       = "IngressesDeployed"
	reasonInProgress            = "InProgress"
	reasonSucceeded             = "Succeeded"
	reasonDeployFailed          = "DeployFailed"
)

// +kubebuilder:rbac:groups=rctf.osec.io,resources=challengeinstances,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=rctf.osec.io,resources=challengeinstances/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=rctf.osec.io,resources=challengeinstances/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=ingressroutes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=ingressroutetcps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=traefik.io,resources=middlewares,verbs=get;list;watch;create;update;patch;delete

type exposedHostname struct {
	Kind          rctfv1.ExposeType `json:"kind"`
	HostPrefix    string            `json:"hostPrefix"`
	Host          string            `json:"host"`
	Port          uint16            `json:"port"`
	ContainerName string            `json:"containerName"`
	ContainerPort uint16            `json:"containerPort"`
	Title         *string           `json:"title,omitempty"`
}

func getNamespaceForInstance(instance *rctfv1.ChallengeInstance) string {
	return fmt.Sprintf(
		"inst-%s-%s",
		strings.ToLower(instance.Spec.ChallengeId),
		strings.ToLower(instance.Spec.TeamId),
	)
}

func getInstanceUIDHostSuffix(instance *rctfv1.ChallengeInstance) string {
	return strings.ReplaceAll(string(instance.UID), "-", "")[:12]
}

func getHostnameForExpose(instance *rctfv1.ChallengeInstance, expose rctfv1.ChallengeInstanceExpose, instancerHost string) string {
	return fmt.Sprintf("%s-%s.%s", expose.HostPrefix, getInstanceUIDHostSuffix(instance), instancerHost)
}

func getEndpointForExpose(instance *rctfv1.ChallengeInstance, expose rctfv1.ChallengeInstanceExpose, instancerHost string) rctfv1.ChallengeInstanceStatusEndpoint {
	if expose.Kind == rctfv1.TCP {
		return rctfv1.ChallengeInstanceStatusEndpoint{
			Kind:  expose.Kind,
			Host:  "unsupported-by-instancer",
			Port:  0,
			Title: nil,
		}
	}

	return rctfv1.ChallengeInstanceStatusEndpoint{
		Kind:  expose.Kind,
		Host:  getHostnameForExpose(instance, expose, instancerHost),
		Port:  exposeTypeToPort(expose.Kind),
		Title: expose.Title,
	}
}

func getExposedHostnamesAnnotationValue(instance *rctfv1.ChallengeInstance, instancerHost string) (string, error) {
	exposedHostnames := make([]exposedHostname, 0, len(instance.Spec.Expose))
	for _, expose := range instance.Spec.Expose {
		endpoint := getEndpointForExpose(instance, expose, instancerHost)
		exposedHostnames = append(exposedHostnames, exposedHostname{
			Kind:          endpoint.Kind,
			HostPrefix:    expose.HostPrefix,
			Host:          endpoint.Host,
			Port:          endpoint.Port,
			ContainerName: expose.ContainerName,
			ContainerPort: expose.ContainerPort,
			Title:         endpoint.Title,
		})
	}

	value, err := json.Marshal(exposedHostnames)
	if err != nil {
		return "", fmt.Errorf("marshalling exposed hostnames failed: %w", err)
	}

	return string(value), nil
}

func (r *ChallengeInstanceReconciler) setComponentStatus(instance *rctfv1.ChallengeInstance, statusType string, status metav1.ConditionStatus, reason string) {
	meta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:   statusType,
		Status: status,
		Reason: reason,
	})
}

func (r *ChallengeInstanceReconciler) updateStatus(ctx context.Context, key client.ObjectKey, status rctfv1.ChallengeInstanceStatus) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var latest rctfv1.ChallengeInstance
		if err := r.Get(ctx, key, &latest); err != nil {
			return err
		}

		latest.Status = status
		return r.Status().Update(ctx, &latest)
	})
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ChallengeInstanceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (result ctrl.Result, err error) {
	log := logf.FromContext(ctx)

	var instance rctfv1.ChallengeInstance
	if err := r.Get(ctx, req.NamespacedName, &instance); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !instance.DeletionTimestamp.IsZero() {
		// To finish deletion of a ChallengeInstance, we must get rid of the namespace. This means that
		// either it doesn't exist (and therefore we're good), or it does exist and may be in a state
		// of not being deleted yet, or already being deleted, and we just need to wait.
		var namespace corev1.Namespace
		if err := r.Get(ctx, types.NamespacedName{Name: getNamespaceForInstance(&instance)}, &namespace); apierrors.IsNotFound(err) {
			controllerutil.RemoveFinalizer(&instance, finalizer)
			if err := r.Update(ctx, &instance); err != nil {
				log.Error(err, "Unable to remove finalizer")
				return ctrl.Result{}, fmt.Errorf("failed to remove finalizer: %w", err)
			}

			return ctrl.Result{}, nil
		}

		if namespace.DeletionTimestamp.IsZero() {
			if err := r.Delete(ctx, &namespace); err != nil {
				log.Error(err, "Unable to delete namespace")
				return ctrl.Result{}, fmt.Errorf("failed to delete namespace %s: %w", namespace.Name, err)
			}
		}

		return ctrl.Result{RequeueAfter: 2 * time.Second}, nil
	}

	if !controllerutil.ContainsFinalizer(&instance, finalizer) {
		controllerutil.AddFinalizer(&instance, finalizer)
		if err := r.Update(ctx, &instance); err != nil {
			// don't proceed to create resources without the finalizer
			// persisted server-side, otherwise the namespace (which has no
			// owner reference) can leak if the CR is deleted before a later
			// reconcile re-adds it
			log.Error(err, "Unable to add finalizer to ChallengeInstance")
			return ctrl.Result{}, fmt.Errorf("failed to add finalizer to ChallengeInstance: %w", err)
		}
	}

	// After a successful reconciliation, we instruct the reconciliation to run after the expiration time. This way,
	// we can very easily guarantee automatic clean up of the ChallengeInstance resource.
	if time.Now().After(instance.Spec.ExpiresAt.Time) {
		if err := r.Delete(ctx, &instance); err != nil {
			log.Error(err, "Unable to delete ChallengeInstance")
			return ctrl.Result{}, fmt.Errorf("failed to delete ChallengeInstance: %w", err)
		}

		return ctrl.Result{}, nil
	}

	defer func() {
		if err := r.updateStatus(ctx, req.NamespacedName, instance.Status); err != nil {
			log.Error(err, "Unable to update ChallengeInstance status")
		}
	}()

	wasReady := meta.IsStatusConditionTrue(instance.Status.Conditions, typeReady)
	r.setComponentStatus(&instance, typeReady, metav1.ConditionFalse, reasonInProgress)

	if err := r.deployResources(ctx, &instance); err != nil {
		log.Error(err, "Unable to deploy resources")
		// failed during the first deploy, set deploy failed so that the platform can display the "ERRORED" status
		if !wasReady {
			r.setComponentStatus(&instance, typeReady, metav1.ConditionUnknown, reasonDeployFailed)
		}
		return ctrl.Result{}, fmt.Errorf("unable to deploy resources: %w", err)
	}

	// At this point all resources are deployed, so we no longer treat errors as deploy failures.
	ready, err := r.areDeploymentsReady(ctx, &instance)
	if err != nil {
		log.Error(err, "Unable to check deployment readiness")
		return ctrl.Result{RequeueAfter: 3 * time.Second}, nil
	}
	if !ready {
		return ctrl.Result{RequeueAfter: 3 * time.Second}, nil
	}
	r.setComponentStatus(&instance, typeReady, metav1.ConditionTrue, reasonSucceeded)

	return ctrl.Result{
		RequeueAfter: time.Until(instance.Spec.ExpiresAt.Time),
	}, nil
}

func (r *ChallengeInstanceReconciler) deployResources(ctx context.Context, instance *rctfv1.ChallengeInstance) error {
	log := logf.FromContext(ctx)
	namespaceName := getNamespaceForInstance(instance)

	// Deploying a ChallengeInstance consists from the following components:
	// - the namespace holding all the instance's resources
	// - network policy blocking all ingress/egress, except intra-namespace
	// - network policy allowing ingress from Traefik
	// - network policy allowing egress for opted-in pods
	// - services for each pod
	// - deployment for each pod
	// - ingress objects for each exposed pod

	r.setComponentStatus(instance, typeNamespaceDeployed, metav1.ConditionFalse, reasonInProgress)
	namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}
	_, err := ctrl.CreateOrUpdate(ctx, r.Client, namespace, func() error {
		namespace.Labels = map[string]string{
			labelManagedBy:   managedBy,
			labelTeamId:      instance.Spec.TeamId,
			labelChallengeId: instance.Spec.ChallengeId,
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to create namespace: %w", err)
	}
	r.setComponentStatus(instance, typeNamespaceDeployed, metav1.ConditionTrue, reasonSucceeded)

	r.setComponentStatus(instance, typeNetworkPoliciesDeployed, metav1.ConditionFalse, reasonInProgress)
	isolateNetworkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "isolate-namespace", Namespace: namespaceName}}
	_, err = ctrl.CreateOrUpdate(ctx, r.Client, isolateNetworkPolicy, func() error {
		isolateNetworkPolicy.Labels = map[string]string{
			labelManagedBy:   managedBy,
			labelTeamId:      instance.Spec.TeamId,
			labelChallengeId: instance.Spec.ChallengeId,
		}

		isolateNetworkPolicy.Spec = networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{},
			PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress, networkingv1.PolicyTypeEgress},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				// allow ingress from current namespace to current namespace
				{
					From: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{
									"kubernetes.io/metadata.name": namespace.Name,
								},
							},
						},
					},
				},
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{
				// allow egress from current namespace to current namespace
				{
					To: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{
									"kubernetes.io/metadata.name": namespace.Name,
								},
							},
						},
					},
				},
			},
		}

		return ctrl.SetControllerReference(instance, isolateNetworkPolicy, r.Scheme)
	})
	if err != nil {
		return fmt.Errorf("failed to create isolate network policy: %w", err)
	}

	traefikNetworkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "allow-ingress-traefik", Namespace: namespaceName}}
	_, err = ctrl.CreateOrUpdate(ctx, r.Client, traefikNetworkPolicy, func() error {
		traefikNetworkPolicy.Labels = map[string]string{
			labelManagedBy:   managedBy,
			labelTeamId:      instance.Spec.TeamId,
			labelChallengeId: instance.Spec.ChallengeId,
		}

		traefikNetworkPolicy.Spec = networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{
				MatchLabels: map[string]string{
					labelExposed: "true",
				},
			},
			PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				// allow ingress from Traefik to exposed pods
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
		}

		return ctrl.SetControllerReference(instance, traefikNetworkPolicy, r.Scheme)
	})
	if err != nil {
		return fmt.Errorf("failed to create traefik network policy: %w", err)
	}

	egressNetworkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "allow-egress-label", Namespace: namespaceName}}
	_, err = ctrl.CreateOrUpdate(ctx, r.Client, egressNetworkPolicy, func() error {
		egressNetworkPolicy.Labels = map[string]string{
			labelManagedBy:   managedBy,
			labelTeamId:      instance.Spec.TeamId,
			labelChallengeId: instance.Spec.ChallengeId,
		}

		egressNetworkPolicy.Spec = networkingv1.NetworkPolicySpec{
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
		}

		return ctrl.SetControllerReference(instance, egressNetworkPolicy, r.Scheme)
	})
	if err != nil {
		return fmt.Errorf("failed to create egress network policy: %w", err)
	}
	r.setComponentStatus(instance, typeNetworkPoliciesDeployed, metav1.ConditionTrue, reasonSucceeded)

	r.setComponentStatus(instance, typeServicesDeployed, metav1.ConditionFalse, reasonInProgress)
	serviceObjectManager := newObjectManager([]client.ObjectList{
		&corev1.ServiceList{},
	}, map[string]string{
		labelManagedBy:   managedBy,
		labelTeamId:      instance.Spec.TeamId,
		labelChallengeId: instance.Spec.ChallengeId,
	}, objectManagerInNamespaces(namespace.Name))
	var serviceHostAliases []corev1.HostAlias
	for _, pod := range instance.Spec.Pods {
		service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: pod.Name, Namespace: namespace.Name}}
		_, err := ctrl.CreateOrUpdate(ctx, r.Client, service, func() error {
			service.Labels = map[string]string{
				labelManagedBy:   managedBy,
				labelTeamId:      instance.Spec.TeamId,
				labelChallengeId: instance.Spec.ChallengeId,
			}

			// replacing the complete spec would clear immutable values
			service.Spec.Selector = map[string]string{
				labelPod: pod.Name,
			}
			service.Spec.Ports = pod.Ports

			return ctrl.SetControllerReference(instance, service, r.Scheme)
		})
		if err != nil {
			return fmt.Errorf("failed to create service for pod %s: %w", pod.Name, err)
		}
		serviceObjectManager.Track(service)

		serviceHostAliases = append(serviceHostAliases, corev1.HostAlias{
			IP:        service.Spec.ClusterIP,
			Hostnames: []string{pod.Name},
		})
	}
	if err := serviceObjectManager.Cleanup(ctx, r.Client); err != nil {
		log.Error(err, "Failed to clean up service objects")
	}
	r.setComponentStatus(instance, typeServicesDeployed, metav1.ConditionTrue, reasonSucceeded)

	r.setComponentStatus(instance, typeDeploymentsDeployed, metav1.ConditionFalse, reasonInProgress)
	exposedHostnames, err := getExposedHostnamesAnnotationValue(instance, r.InstancerHost)
	if err != nil {
		return fmt.Errorf("failed to get exposed hostnames annotation value: %w", err)
	}

	deploymentObjectManager := newObjectManager([]client.ObjectList{
		&appsv1.DeploymentList{},
	}, map[string]string{
		labelManagedBy:   managedBy,
		labelTeamId:      instance.Spec.TeamId,
		labelChallengeId: instance.Spec.ChallengeId,
	}, objectManagerInNamespaces(namespace.Name))
	for _, pod := range instance.Spec.Pods {
		deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: pod.Name, Namespace: namespace.Name}}
		_, err := ctrl.CreateOrUpdate(ctx, r.Client, deployment, func() error {
			deployment.Labels = map[string]string{
				labelManagedBy:   managedBy,
				labelTeamId:      instance.Spec.TeamId,
				labelChallengeId: instance.Spec.ChallengeId,
			}

			podLabels := map[string]string{}
			maps.Copy(podLabels, pod.Labels)
			podLabels[labelManagedBy] = managedBy
			podLabels[labelTeamId] = instance.Spec.TeamId
			podLabels[labelChallengeId] = instance.Spec.ChallengeId
			podLabels[labelPod] = pod.Name
			podLabels[labelEgress] = strconv.FormatBool(pod.Egress)
			podLabels[labelExposed] = strconv.FormatBool(slices.ContainsFunc(instance.Spec.Expose, func(expose rctfv1.ChallengeInstanceExpose) bool {
				return expose.ContainerName == pod.Name
			}))

			// having secure defaults is nice
			podSpec := *pod.Spec.DeepCopy()
			if podSpec.AutomountServiceAccountToken == nil {
				podSpec.AutomountServiceAccountToken = ptr.To(false)
			}
			if podSpec.EnableServiceLinks == nil {
				podSpec.EnableServiceLinks = ptr.To(false)
			}
			podSpec.HostAliases = serviceHostAliases

			deployment.Spec = appsv1.DeploymentSpec{
				Replicas: ptr.To[int32](1),
				Selector: &metav1.LabelSelector{
					MatchLabels: map[string]string{
						labelPod: pod.Name,
					},
				},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{
						Annotations: map[string]string{
							// Allow the cluster autoscaler to evict these pods during scale-down,
							// otherwise it blocks on orphaned pods mid-namespace-deletion.
							"cluster-autoscaler.kubernetes.io/safe-to-evict": "true",

							annotationExposedHostnames: exposedHostnames,
						},
						Labels: podLabels,
					},
					Spec: podSpec,
				},
			}

			return ctrl.SetControllerReference(instance, deployment, r.Scheme)
		})
		if err != nil {
			return fmt.Errorf("failed to create deployment %s: %w", pod.Name, err)
		}
		deploymentObjectManager.Track(deployment)
	}
	if err := deploymentObjectManager.Cleanup(ctx, r.Client); err != nil {
		log.Error(err, "Failed to clean up deployment objects")
	}
	r.setComponentStatus(instance, typeDeploymentsDeployed, metav1.ConditionTrue, reasonSucceeded)

	r.setComponentStatus(instance, typeIngressesDeployed, metav1.ConditionFalse, reasonInProgress)
	ingressObjectManager := newObjectManager([]client.ObjectList{
		&v1alpha1.IngressRouteList{},
		&v1alpha1.MiddlewareList{},
		&v1alpha1.IngressRouteTCPList{},
	}, map[string]string{
		labelManagedBy:   managedBy,
		labelTeamId:      instance.Spec.TeamId,
		labelChallengeId: instance.Spec.ChallengeId,
	}, objectManagerInNamespaces(namespace.Name))
	instance.Status.Endpoints = nil // in case an operation fails, we don't want n duplicates
	for _, expose := range instance.Spec.Expose {
		endpoint := getEndpointForExpose(instance, expose, r.InstancerHost)
		if expose.Kind == rctfv1.TCP {
			log.Error(errors.New("unsupported expose kind TCP used"), "creating ingress failed")

			// Right now, rCTF assumes we return expose -> endpoints mapped in the exact same order
			instance.Status.Endpoints = append(instance.Status.Endpoints, endpoint)
			continue
		}

		objects := exposeToObjects(instance, expose, endpoint.Host)
		for _, object := range objects {
			_, err := ctrl.CreateOrUpdate(ctx, r.Client, object, func() error {
				return ctrl.SetControllerReference(instance, object, r.Scheme)
			})
			if err != nil {
				return fmt.Errorf("creating ingress object %s for endpoint %s failed: %w", object.GetName(), endpoint.Host, err)
			}
			ingressObjectManager.Track(object)
		}

		instance.Status.Endpoints = append(instance.Status.Endpoints, endpoint)
	}
	if err := ingressObjectManager.Cleanup(ctx, r.Client); err != nil {
		log.Error(err, "Failed to clean up ingress objects")
	}
	r.setComponentStatus(instance, typeIngressesDeployed, metav1.ConditionTrue, reasonSucceeded)

	return nil
}

func (r *ChallengeInstanceReconciler) areDeploymentsReady(ctx context.Context, instance *rctfv1.ChallengeInstance) (bool, error) {
	namespaceName := getNamespaceForInstance(instance)

	for _, pod := range instance.Spec.Pods {
		var deployment appsv1.Deployment
		if err := r.Get(ctx, types.NamespacedName{Namespace: namespaceName, Name: pod.Name}, &deployment); err != nil {
			return false, fmt.Errorf("getting deployment %s failed: %w", pod.Name, err)
		}

		expectedReplicas := int32(1)
		if deployment.Spec.Replicas != nil {
			expectedReplicas = *deployment.Spec.Replicas
		}

		if deployment.Status.ReadyReplicas < expectedReplicas {
			return false, nil
		}
	}

	return true, nil
}

func exposeTypeToPort(exposeType rctfv1.ExposeType) uint16 {
	switch exposeType {
	// TCP is not supported (for now)
	case rctfv1.TCP_SSL:
		return 1337
	case rctfv1.HTTP:
		return 80
	case rctfv1.HTTPS:
		return 443
	default:
		panic(fmt.Sprintf("unsupported expose kind %s", exposeType))
	}
}

func exposeToObjects(instance *rctfv1.ChallengeInstance, expose rctfv1.ChallengeInstanceExpose, hostname string) []client.Object {
	namespaceName := getNamespaceForInstance(instance)
	baseName := fmt.Sprintf("%s-%d", expose.ContainerName, expose.ContainerPort)

	switch expose.Kind {
	// TCP is not supported (for now)
	case rctfv1.HTTP:
		return []client.Object{
			&v1alpha1.IngressRoute{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-http", baseName),
					Labels: map[string]string{
						labelManagedBy:   managedBy,
						labelTeamId:      instance.Spec.TeamId,
						labelChallengeId: instance.Spec.ChallengeId,
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
	case rctfv1.HTTPS:
		return []client.Object{
			&v1alpha1.Middleware{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-redirect", baseName),
					Labels: map[string]string{
						labelManagedBy:   managedBy,
						labelTeamId:      instance.Spec.TeamId,
						labelChallengeId: instance.Spec.ChallengeId,
					},
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
					Name:      fmt.Sprintf("%s-http-redirect", baseName),
					Labels: map[string]string{
						labelManagedBy:   managedBy,
						labelTeamId:      instance.Spec.TeamId,
						labelChallengeId: instance.Spec.ChallengeId,
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
									Name: fmt.Sprintf("%s-redirect", baseName),
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
					Name:      fmt.Sprintf("%s-https", baseName),
					Labels: map[string]string{
						labelManagedBy:   managedBy,
						labelTeamId:      instance.Spec.TeamId,
						labelChallengeId: instance.Spec.ChallengeId,
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
	case rctfv1.TCP_SSL:
		return []client.Object{
			&v1alpha1.IngressRouteTCP{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: namespaceName,
					Name:      fmt.Sprintf("%s-tcp-ssl", baseName),
					Labels: map[string]string{
						labelManagedBy:   managedBy,
						labelTeamId:      instance.Spec.TeamId,
						labelChallengeId: instance.Spec.ChallengeId,
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

// SetupWithManager sets up the controller with the Manager.
func (r *ChallengeInstanceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&rctfv1.ChallengeInstance{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&networkingv1.NetworkPolicy{}).
		Owns(&v1alpha1.IngressRoute{}).
		Owns(&v1alpha1.IngressRouteTCP{}).
		Owns(&v1alpha1.Middleware{}).
		Named("challengeinstance").
		Complete(r)
}

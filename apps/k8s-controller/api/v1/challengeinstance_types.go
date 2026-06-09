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

package v1

import (
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// This should match rCTF's ExposeKind schema.
// +kubebuilder:validation:Enum=tcp;tcp-ssl;http;https
type ExposeType string

const (
	TCP     ExposeType = "tcp"
	TCP_SSL ExposeType = "tcp-ssl"
	HTTP    ExposeType = "http"
	HTTPS   ExposeType = "https"
)

// ChallengeInstanceExpose defines the ingresses that should be deployed. This should match rCTF's
// InstancerExpose schema.
type ChallengeInstanceExpose struct {
	// +required
	Kind ExposeType `json:"kind"`

	// +required
	// +kubebuilder:validation:MinLength=1
	HostPrefix string `json:"hostPrefix"`

	// +required
	// +kubebuilder:validation:MinLength=1
	ContainerName string `json:"containerName"`

	// +required
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	ContainerPort uint16 `json:"containerPort"`

	// +optional
	ShouldDisplay *bool `json:"shouldDisplay"` // handled by rCTF itself

	// +optional
	// +kubebuilder:validation:MinLength=0
	Title *string `json:"title"`
}

// ChallengeInstancePod defines the deployments that should be deployed
type ChallengeInstancePod struct {
	// +required
	Name string `json:"name"`

	// +optional
	Ports []v1.ServicePort `json:"ports"`

	// +required
	Spec v1.PodSpec `json:"spec"`

	// +optional
	Egress bool `json:"egress"`
}

// ChallengeInstanceSpec defines the desired state of ChallengeInstance
type ChallengeInstanceSpec struct {
	// +required
	// +kubebuilder:validation:MinLength=1
	TeamId string `json:"teamId"`

	// +required
	// +kubebuilder:validation:MinLength=1
	ChallengeId string `json:"challengeId"`

	// +required
	ExpiresAt metav1.Time `json:"expiresAt"`

	// +required
	// +listType=atomic
	// +kubebuilder:validation:MinItems=1
	Pods []ChallengeInstancePod `json:"pods"`

	// +required
	// +listType=atomic
	// +kubebuilder:validation:MinItems=1
	Expose []ChallengeInstanceExpose `json:"expose"`
}

type ChallengeInstanceStatusEndpoint struct {
	// +required
	Kind ExposeType `json:"kind"`

	// +required
	Host string `json:"host"`

	// +required
	Port uint16 `json:"port"`

	// +optional
	// +kubebuilder:validation:MinLength=0
	Title *string `json:"title"`
}

// ChallengeInstanceStatus defines the observed state of ChallengeInstance.
type ChallengeInstanceStatus struct {
	// +listType=atomic
	// +optional
	Endpoints []ChallengeInstanceStatusEndpoint `json:"endpoints,omitempty"`

	// conditions represent the current state of the ChallengeInstance resource.
	// Each condition has a unique type and reflects the status of a specific aspect of the resource.
	//
	// Standard condition types include:
	// - "Available": the resource is fully functional
	// - "Progressing": the resource is being created or updated
	// - "Degraded": the resource failed to reach or maintain its desired state
	//
	// The status of each condition is one of True, False, or Unknown.
	// +listType=map
	// +listMapKey=type
	// +optional
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster

// ChallengeInstance is the Schema for the challengeinstances API
type ChallengeInstance struct {
	metav1.TypeMeta `json:",inline"`

	// metadata is a standard object metadata
	// +optional
	metav1.ObjectMeta `json:"metadata,omitzero"`

	// spec defines the desired state of ChallengeInstance
	// +required
	Spec ChallengeInstanceSpec `json:"spec"`

	// status defines the observed state of ChallengeInstance
	// +optional
	Status ChallengeInstanceStatus `json:"status,omitzero"`
}

// +kubebuilder:object:root=true

// ChallengeInstanceList contains a list of ChallengeInstance
type ChallengeInstanceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitzero"`
	Items           []ChallengeInstance `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ChallengeInstance{}, &ChallengeInstanceList{})
}

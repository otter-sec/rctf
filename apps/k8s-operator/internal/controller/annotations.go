package controller

import (
	"encoding/json"
	"fmt"

	rctfv1 "github.com/otter-sec/rctf/api/v1"
)

type exposedHostname struct {
	Kind          rctfv1.ExposeType `json:"kind"`
	HostPrefix    string            `json:"hostPrefix"`
	Host          string            `json:"host"`
	Port          uint16            `json:"port"`
	ContainerName string            `json:"containerName"`
	ContainerPort uint16            `json:"containerPort"`
	Title         *string           `json:"title,omitempty"`
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

func getFirstFlagAnnotationValue(flagsJson string) string {
	var flags []struct {
		Flag string `json:"flag"`
	}
	if err := json.Unmarshal([]byte(flagsJson), &flags); err != nil || len(flags) == 0 {
		return ""
	}
	return flags[0].Flag
}

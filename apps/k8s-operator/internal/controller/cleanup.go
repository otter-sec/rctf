package controller

import (
	"context"
	"fmt"
	"maps"
	"reflect"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type managedObjectKind struct {
	list    client.ObjectList
	tracked map[string]struct{}
}

type objectManager struct {
	managedObjects map[string]*managedObjectKind
	labels         map[string]string
	namespaces     []string
	inNamespace    bool
}

type objectManagerOption func(*objectManager)

func objectManagerInNamespaces(namespaces ...string) objectManagerOption {
	return func(manager *objectManager) {
		manager.namespaces = namespaces
		manager.inNamespace = true
	}
}

func kindForObject(obj any) string {
	t := reflect.TypeOf(obj)
	for t.Kind() == reflect.Pointer {
		t = t.Elem()
	}

	return strings.TrimSuffix(t.Name(), "List")
}

func newObjectManager(managedObjects []client.ObjectList, labels map[string]string, opts ...objectManagerOption) *objectManager {
	manager := &objectManager{
		managedObjects: map[string]*managedObjectKind{},
		labels:         labels,
	}

	for _, opt := range opts {
		opt(manager)
	}

	for _, item := range managedObjects {
		kind := kindForObject(item)
		manager.managedObjects[kind] = &managedObjectKind{
			list:    item,
			tracked: map[string]struct{}{},
		}
	}

	return manager
}

func (m *objectManager) matchingLabels() client.MatchingLabels {
	return maps.Clone(m.labels)
}

func (m *objectManager) Track(obj client.Object) {
	kind := kindForObject(obj)
	managed, ok := m.managedObjects[kind]
	if !ok {
		fmt.Printf("WARN: Trying to track kind %s while it is not managed...?\n", kind)
		return
	}

	managed.tracked[m.objectKey(obj)] = struct{}{}
}

func (m *objectManager) Cleanup(ctx context.Context, c client.Client) error {
	for kind, managed := range m.managedObjects {
		if m.inNamespace {
			for _, namespace := range m.namespaces {
				if err := m.cleanupKind(ctx, c, kind, managed, namespace); err != nil {
					return err
				}
			}

			continue
		}

		if err := m.cleanupKind(ctx, c, kind, managed, ""); err != nil {
			return err
		}
	}

	return nil
}

func (m *objectManager) cleanupKind(ctx context.Context, c client.Client, kind string, managed *managedObjectKind, namespace string) error {
	listOpts := []client.ListOption{m.matchingLabels()}
	if namespace != "" {
		listOpts = append(listOpts, client.InNamespace(namespace))
	}

	if err := c.List(ctx, managed.list, listOpts...); err != nil {
		return fmt.Errorf("failed to list managed %s resources: %w", kind, err)
	}

	items, err := meta.ExtractList(managed.list)
	if err != nil {
		return fmt.Errorf("failed to extract managed %s resources: %w", kind, err)
	}

	for _, item := range items {
		obj, ok := item.(client.Object)
		if !ok {
			return fmt.Errorf("managed %s item %T is not a client object", kind, item)
		}
		if _, ok := managed.tracked[m.objectKey(obj)]; ok {
			continue
		}

		if err := c.Delete(ctx, obj); err != nil && !apierrors.IsNotFound(err) {
			return fmt.Errorf("failed to delete managed %s resource %s/%s: %w", kind, obj.GetNamespace(), obj.GetName(), err)
		}
	}

	return nil
}

func (m *objectManager) objectKey(obj client.Object) string {
	if !m.inNamespace {
		return obj.GetName()
	}

	namespace := obj.GetNamespace()
	if namespace == "" && len(m.namespaces) == 1 {
		namespace = m.namespaces[0]
	}

	return namespace + "/" + obj.GetName()
}

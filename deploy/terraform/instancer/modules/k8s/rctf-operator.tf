data "kubectl_file_documents" "rctf-operator" {
    content = replace(
        file("${path.module}/../../../../../apps/k8s-operator/dist/install.yaml"),
        "INSTANCER_HOST",
        var.instancer_host
    )
}

resource "kubectl_manifest" "rctf-operator" {
    for_each  = data.kubectl_file_documents.rctf-operator.manifests
    yaml_body = each.value
}

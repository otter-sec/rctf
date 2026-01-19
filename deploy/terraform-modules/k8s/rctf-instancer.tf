data "kubectl_file_documents" "rctf-instancer-controller" {
    content = replace(
        file("${path.module}/../../../apps/k8s-controller/dist/install.yaml"),
        "INSTANCER_HOST",
        var.instancer_host
    )
}

resource "kubectl_manifest" "rctf-instancer" {
    for_each  = data.kubectl_file_documents.rctf-instancer-controller.manifests
    yaml_body = each.value
}

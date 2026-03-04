// TODO: we need to allow configuring how the traefik service is exposed, ideally depending on deployment type (GKE, bare-metal, etc.)
resource "helm_release" "traefik" {
    name = "traefik"
    repository = "https://traefik.github.io/charts"
    chart = "traefik"

    namespace = "traefik"
    create_namespace = true

    values = [
        yamlencode({
            ingressRoute = {
                # enable dashboard for debugging - exposed only in the `traefik` entrypoint (accessible with kubectl port-forward on port 8080)
                dashboard = {
                    enabled = true
                }
            }

            service = {
                type = "LoadBalancer"

                spec = {
                    # Make GKE not drop the original IP address the connection comes from
                    externalTrafficPolicy = "Local"
                }
            }

            ports = {
                web = {
                    port = 80
                    expose = {
                        default = true
                    }
                    exposedPort = 80
                    protocol = "TCP"
                    http = {
                        middlewares = ["traefik-global-errors@kubernetescrd"]
                    }
                }

                websecure = {
                    port = 443
                    expose = {
                        default = true
                    }
                    exposedPort = 443
                    protocol = "TCP"
                    http = {
                        middlewares = ["traefik-global-errors@kubernetescrd"]
                    }
                }

                tcp = {
                    port = 1337
                    expose = {
                        default = true
                    }
                    exposedPort = 1337
                    protocol = "TCP"
                }
            }

            providers = {
                kubernetesIngress = {
                    enabled = true
                }
            }
        })
    ]

    wait = true
}

data "kubernetes_service_v1" "traefik" {
    metadata {
        name = "traefik"
        namespace = helm_release.traefik.namespace
    }

    depends_on = [helm_release.traefik]
}

output "traefik_external_ip" {
    value = try(
        data.kubernetes_service_v1.traefik.status[0].load_balancer[0].ingress[0].ip,
        null
    )
}

# Setup a dummy nginx container that can be used to serve fallback pages
resource "kubernetes_config_map_v1" "error-pages" {
    metadata {
        name = "error-pages"
        namespace = helm_release.traefik.namespace
    }

    data = {
        "nginx.conf" = file("${path.module}/error-pages/nginx.conf")
        "404.html" = templatefile("${path.module}/error-pages/404.html", {
            ctf_name = var.ctf_name
        })
        "502.html" = templatefile("${path.module}/error-pages/502.html", {
            ctf_name = var.ctf_name
        })
    }
}

resource "kubernetes_deployment_v1" "error-pages" {
    metadata {
        name = "error-pages"
        namespace = helm_release.traefik.namespace
    }

    spec {
        replicas = 1

        selector {
            match_labels = {
                app = "error-pages"
            }
        }

        template {
            metadata {
                labels = {
                    app = "error-pages"
                }
            }

            spec {
                container {
                    name = "nginx"
                    image = "nginx:latest"

                    port {
                        container_port = 80
                    }

                    volume_mount {
                        name = "cfg"
                        mount_path = "/etc/nginx/nginx.conf"
                        sub_path = "nginx.conf"
                    }

                    volume_mount {
                        name = "cfg"
                        mount_path = "/usr/share/nginx/error-pages/404.html"
                        sub_path = "404.html"
                    }

                    volume_mount {
                        name = "cfg"
                        mount_path = "/usr/share/nginx/error-pages/502.html"
                        sub_path = "502.html"
                    }

                    readiness_probe {
                        http_get {
                            path = "/.rctf-instancer/health"
                            port = 80
                        }
                    }
                }

                volume {
                    name = "cfg"

                    config_map {
                        name = kubernetes_config_map_v1.error-pages.metadata[0].name
                    }
                }
            }
        }
    }

    lifecycle {
        # redeploy the deployment so that the pages update
        replace_triggered_by = [kubernetes_config_map_v1.error-pages]
    }
}

resource "kubernetes_service_v1" "error-pages" {
    metadata {
        name = "error-pages"
        namespace = helm_release.traefik.namespace
    }

    spec {
        selector = {
            app = "error-pages"
        }

        port {
            name = "http"
            port = 80
            target_port = 80
        }
    }
}

resource "kubectl_manifest" "global-errors" {
    yaml_body = yamlencode({
        apiVersion = "traefik.io/v1alpha1"
        kind = "Middleware"

        metadata = {
            name = "global-errors"
            namespace = helm_release.traefik.namespace
        }

        spec = {
            errors = {
                // this does not have 404 because it won't work as a catch-all and instead serve custom page if the challenge behind it returns a 404
                status = ["502"],

                service = {
                    name = kubernetes_service_v1.error-pages.metadata[0].name
                    namespace = kubernetes_service_v1.error-pages.metadata[0].namespace
                    port = 80
                }

                query = "/.rctf-instancer/{status}.html"
            }
        }
    })
}

resource "kubectl_manifest" "catch-all" {
    yaml_body = yamlencode({
        apiVersion = "traefik.io/v1alpha1"
        kind       = "IngressRoute"

        metadata = {
            name      = "catch-all"
            namespace = helm_release.traefik.namespace
        }

        spec = {
            entryPoints = ["web", "websecure"]
            routes = [
                {
                    kind = "Rule"
                    match = "HostRegexp(`.*`)"
                    priority = 1
                    services = [
                        {
                            name = kubernetes_service_v1.error-pages.metadata[0].name
                            port = 80
                        }
                    ]
                }
            ]
        }
    })
}

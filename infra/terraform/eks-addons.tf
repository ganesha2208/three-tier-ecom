# --- IAM role for the AWS Load Balancer Controller (IRSA) ---
#
# The controller runs as a pod in kube-system. When an Ingress is created it
# calls the AWS API to provision a real ALB. Those API calls need permissions.
#
# Instead of static keys, we bind the controller's Kubernetes ServiceAccount
# to this IAM role via the cluster's OIDC provider (IRSA). The pod then fetches
# short-lived credentials automatically — same keyless pattern as GitHub OIDC.
#
# `attach_load_balancer_controller_policy = true` makes the module attach the
# exact IAM policy AWS publishes for this controller.
module "lb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name                              = "${var.project}-lb-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn = module.eks.oidc_provider_arn
      # The role can only be assumed by THIS service account in THIS namespace.
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }

  tags = {
    Project = var.project
  }
}

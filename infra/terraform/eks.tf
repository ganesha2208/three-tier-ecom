# EKS cluster + one managed node group, built with the community EKS module.
# The module also creates the cluster IAM roles, security groups, and the
# OIDC provider used for IRSA (giving pods their own IAM permissions).
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${var.project}-eks"
  cluster_version = var.eks_version

  # Public API endpoint so kubectl works from your laptop.
  cluster_endpoint_public_access = true

  # Give the IAM identity running `terraform apply` admin access to the cluster.
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # One managed node group on cheap spot instances.
  eks_managed_node_groups = {
    default = {
      # m7i-flex.large is free-tier-eligible on this account (8 GiB RAM).
      instance_types = ["m7i-flex.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 1
      desired_size = 2
      max_size     = 3
    }
  }

  tags = {
    Project = var.project
  }
}

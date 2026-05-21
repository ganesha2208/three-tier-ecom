output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (for RDS and EKS nodes)"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (for load balancers)"
  value       = module.vpc.public_subnets
}

output "rds_endpoint" {
  description = "PostgreSQL connection endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_secret_arn" {
  description = "Secrets Manager ARN holding the DB master credentials"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "lb_controller_role_arn" {
  description = "IAM role ARN for the AWS Load Balancer Controller service account"
  value       = module.lb_controller_irsa.iam_role_arn
}

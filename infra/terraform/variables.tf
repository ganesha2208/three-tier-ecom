variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Project name — used as a prefix for resource names"
  type        = string
  default     = "shopforge"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.32"
}

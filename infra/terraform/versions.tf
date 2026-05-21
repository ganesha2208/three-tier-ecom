terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in the S3 bucket created in Step 1. S3-native locking
  # (use_lockfile) requires Terraform >= 1.10 — no DynamoDB table needed.
  backend "s3" {
    bucket       = "shopforge-tfstate-563332534764"
    key          = "phase4/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

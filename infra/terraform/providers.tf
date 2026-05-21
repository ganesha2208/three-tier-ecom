provider "aws" {
  region = var.aws_region

  # Every resource created by this config gets these tags automatically.
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
